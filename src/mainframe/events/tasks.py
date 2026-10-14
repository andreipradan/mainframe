import json
import re
from datetime import datetime
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

import structlog
from django.conf import settings
from huey.contrib.djhuey import task

from mainframe.clients.scraper import fetch
from mainframe.events.models import Event
from mainframe.events.persistence import persist_events
from mainframe.sources.models import Source


class FetchBandError(Exception): ...


logger = structlog.get_logger(__name__)


def parse_date_range(result, date_formats):
    date_range = re.fullmatch(
        r"(?P<month>[A-Za-z]+)\s+(?P<day>\d{1,2})"
        r"(?:-\d{1,2})+(?:,\s*(?P<year>\d{4}))?",
        result.strip(),
    )
    if not date_range:
        return None

    for date_format in date_formats:
        if not date_format or not date_format.endswith("%Y"):
            continue
        start_date_format = date_format[:-2].rstrip(", ")
        try:
            dt = datetime.strptime(
                f"{date_range['month']} {date_range['day']}", start_date_format
            )
        except ValueError:
            continue
        return dt.replace(year=int(date_range["year"] or datetime.now().year))

    return None


def parse_date(result, date_formats):
    parse_error = None
    for date_format in date_formats:
        if not date_format:
            continue
        try:
            return datetime.strptime(result, date_format)
        except ValueError as e:
            parse_error = e

    if dt := parse_date_range(result, date_formats):
        return dt
    if parse_error:
        raise parse_error
    raise ValueError(f"No date format configured for {result!r}")


def clean_date(result, config):
    date_formats = (
        config.get("date_format"),
        config.get("date_format_alternative"),
    )
    missing_year = config.get("missing_year")
    dt = parse_date(result, date_formats)
    dt = dt.replace(tzinfo=ZoneInfo(settings.TIME_ZONE))
    if not missing_year:
        return dt

    now = datetime.now()
    dt = dt.replace(year=now.year)
    if dt.month < now.month:
        dt = dt.replace(year=now.year + 1)
    return dt


def clean_url(url):
    parts = urlsplit(url)
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query) if k == "afflky"])
    return urlunsplit(parts._replace(query=query, fragment=""))


def store_concerts(band_name, concerts):
    saved_count = persist_events(concerts, band_name)
    if saved_count:
        logger.info(
            "Successfully saved concerts to database",
            identifier=f"{band_name}: {saved_count}",
        )


def validate_selectors(band, selectors):
    if not selectors:
        raise FetchBandError(f"[{band.name}] Selectors not set on the Source object")

    if not {"list", "location", "start_date", "url"}.issubset(selectors):
        raise FetchBandError(
            f"[{band.name}] Mandatory selectors not set on the Source object"
        )


def get_embedded_event_blocks(band, response):
    if not band.config.get("date_format"):
        raise FetchBandError(f"[{band.name}] Date format not set on the Source object")

    script = response.select_one('script[id$="-smart-data"]')
    if script is None:
        raise FetchBandError(f"[{band.name}] Embedded event data not found")

    script_data = script.string or script.get_text()
    blocks_match = re.search(r"\bblocks\s*:\s*", script_data)
    if not blocks_match:
        raise FetchBandError(f"[{band.name}] Embedded event blocks not found")

    try:
        blocks, _ = json.JSONDecoder().raw_decode(
            script_data[blocks_match.end() :].lstrip()
        )
    except json.JSONDecodeError as e:
        raise FetchBandError(
            f"[{band.name}] Could not parse embedded event blocks"
        ) from e

    if not isinstance(blocks, list):
        raise FetchBandError(f"[{band.name}] Embedded event blocks are not a list")

    return blocks


def parse_embedded_event(band, event):
    if not isinstance(event, dict):
        raise FetchBandError(f"[{band.name}] Invalid embedded event")

    title = event.get("title")
    url = event.get("url")
    if not title or not url:
        raise FetchBandError(f"[{band.name}] Embedded event is missing a title or URL")

    date_label, separator, place = title.partition("|")
    if not separator or not date_label.strip() or not place.strip():
        raise FetchBandError(f"[{band.name}] Invalid embedded event title: {title}")

    place = place.rstrip()
    sold_out_marker = "*SOLD OUT*"
    sold_out = place.upper().endswith(sold_out_marker)
    if sold_out:
        place = place[: -len(sold_out_marker)].rstrip()
    place_parts = re.split(r"[,\.]\s+", place, maxsplit=1)
    city = place_parts[0].strip() if len(place_parts) > 1 else ""
    location = place_parts[-1].strip()
    if not location:
        raise FetchBandError(
            f"[{band.name}] Missing location in embedded event: {title}"
        )

    try:
        start_date = clean_date(date_label.strip(), band.config)
    except (TypeError, ValueError) as e:
        raise FetchBandError(
            f"[{band.name}] Invalid embedded event date in title: {title}"
        ) from e

    return Event(
        source=band,
        title=f"{band.name} @ {location}",
        categories=["music"],
        location=location,
        start_date=start_date,
        url=clean_url(url),
        city=city,
        additional_data={"sold_out": True} if sold_out else {},
        external_id=event.get("id", ""),
    )


def extract_embedded_concerts(band, response):
    concerts = []
    for block in get_embedded_event_blocks(band, response):
        if not isinstance(block, dict):
            raise FetchBandError(f"[{band.name}] Invalid embedded event block")
        if block.get("type") != "ExternalLinks" or not block.get("isEnabled"):
            continue

        concerts.extend(
            parse_embedded_event(band, event) for event in block.get("content") or []
        )

    return concerts


def extract_html_concerts(band, response):
    selectors = band.config.get("selectors")
    validate_selectors(band, selectors)

    def extract_text(element, selector_name):
        if not (selector := selectors.get(selector_name)):
            return ""

        result = element.select_one(selector).get_text(strip=True)
        if not selector_name.endswith("_date"):
            return result

        if not (band.config.get("date_format")):
            raise FetchBandError(
                f"[{band.name}] Date format not set on the Source object"
            )

        return clean_date(result, band.config)

    concerts = []
    for concert in response.select(selectors["list"]):
        location = extract_text(concert, "location")
        if not (title := extract_text(concert, "title")):
            title = f"{band.name} @ {location}"

        concerts.append(
            Event(
                source=band,
                title=title,
                categories=["music"],
                location=location,
                start_date=extract_text(concert, "start_date"),
                url=clean_url(concert.select_one(selectors["url"])["href"]),
                city=extract_text(concert, "city"),
                description=extract_text(concert, "description"),
                end_date=extract_text(concert, "end_date") or None,
                external_id=extract_text(concert, "external_id"),
            )
        )

    return concerts


def api_event_datetime(value, timezone_name, band):
    if not value:
        raise FetchBandError(f"[{band.name}] API event is missing a date")

    try:
        event_date = datetime.fromisoformat(value)
        event_timezone = ZoneInfo(timezone_name or settings.TIME_ZONE)
    except (TypeError, ValueError, KeyError) as e:
        raise FetchBandError(f"[{band.name}] Invalid API event date: {value}") from e

    if event_date.tzinfo is None:
        event_date = event_date.replace(tzinfo=event_timezone)
    return event_date


def parse_api_event(band, event):
    if not isinstance(event, dict) or not isinstance(event.get("attributes"), dict):
        raise FetchBandError(f"[{band.name}] Invalid API event")

    attributes = event["attributes"]
    venue = attributes.get("venue-display-name") or attributes.get("venue-name")
    url = (
        attributes.get("primary-link-url")
        or attributes.get("promoted-link-url")
        or attributes.get("exchange-listing-url")
    )
    if not venue or not url:
        raise FetchBandError(
            f"[{band.name}] API event is missing a venue or ticket URL"
        )

    timezone_name = attributes.get("venue-time-zone")
    start_date = api_event_datetime(
        attributes.get("starts-at-date-local"), timezone_name, band
    )
    end_date_value = attributes.get("ends-at-date-local")
    end_date = (
        api_event_datetime(end_date_value, timezone_name, band)
        if end_date_value
        else None
    )
    city_parts = [
        part
        for part in (
            attributes.get("venue-city"),
            attributes.get("venue-country-code"),
        )
        if part
    ]

    return Event(
        source=band,
        title=f"{band.name} @ {venue.strip()}",
        categories=["music"],
        location=venue.strip(),
        start_date=start_date,
        end_date=end_date,
        url=url,
        city=", ".join(city_parts),
        description=attributes.get("additional-info") or "",
        additional_data={
            "sold_out": bool(attributes.get("is-sold-out")),
            "api": event,
        },
        external_id=event.get("id", ""),
    )


def extract_api_concerts(band, response):
    try:
        events = response.json().get("data")
    except (AttributeError, ValueError) as e:
        raise FetchBandError(f"[{band.name}] Invalid API response") from e

    if not isinstance(events, list):
        raise FetchBandError(f"[{band.name}] API response has no event list")

    return [parse_api_event(band, event) for event in events]


@task(expires=10)
def get_band_concerts(band: Source):
    parser = band.config.get("parser", "html")
    extract_concerts = {
        "embedded": extract_embedded_concerts,
        "html": extract_html_concerts,
        "api": extract_api_concerts,
    }.get(parser)
    if extract_concerts is None:
        raise FetchBandError(f"[{band.name}] Unsupported parser: {parser}")

    if parser == "api":
        headers = {
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            **band.headers,
        }
        response, error = fetch(band.url, soup=False, headers=headers)
    else:
        response, error = fetch(band.url)
    if error:
        raise FetchBandError(error)

    concerts = extract_concerts(band, response)

    if concerts:
        store_concerts(band.name, concerts)
