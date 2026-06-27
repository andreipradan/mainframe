from datetime import datetime
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

import structlog
from django.conf import settings
from huey.contrib.djhuey import task

from mainframe.clients.scraper import fetch
from mainframe.events.models import Event
from mainframe.sources.models import Source


class FetchBandError(Exception): ...


logger = structlog.get_logger(__name__)


def clean_date(result, date_format, missing_year):
    dt = datetime.strptime(result, date_format).replace(
        tzinfo=ZoneInfo(settings.TIME_ZONE)
    )
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
    try:
        Event.objects.bulk_create(
            concerts,
            update_conflicts=True,
            update_fields=[
                "title",
                "categories",
                "location",
                "start_date",
                "additional_data",
                "city",
                "description",
                "end_date",
                "external_id",
                "location_url",
                "updated_at",
            ],
            unique_fields=["location", "start_date", "url"],
        )
    except Exception as e:
        logger.error(
            "Error saving concerts to database",
            error=str(e),
        )
    else:
        logger.info(
            "Successfully saved concerts to database",
            identifier=f"{band_name}: {len(concerts)}",
        )


def validate_selectors(band, selectors):
    if not selectors:
        raise FetchBandError(f"[{band.name}] Selectors not set on the Source object")

    if not {"list", "location", "start_date", "url"}.issubset(selectors):
        raise FetchBandError(
            f"[{band.name}] Mandatory selectors not set on the Source object"
        )


@task(expires=10)
def get_band_concerts(band: Source):
    selectors = band.config.get("selectors")
    validate_selectors(band, selectors)

    def extract_text(element, selector_name):
        if not (selector := selectors.get(selector_name)):
            return ""

        result = element.select_one(selector).get_text(strip=True)
        if not selector_name.endswith("_date"):
            return result

        if not (date_format := band.config.get("date_format")):
            raise FetchBandError(
                f"[{band.name}] Date format not set on the Source object"
            )

        return clean_date(result, date_format, band.config.get("missing_year"))

    concerts = []
    response, error = fetch(band.url)
    if error:
        raise FetchBandError(error)

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

    if concerts:
        store_concerts(band.name, concerts)
        return

    logger.warning("No concerts found", band=band.name)
