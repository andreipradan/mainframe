import json
import logging
import re
import unicodedata
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup
from django.conf import settings

from mainframe.clients.scraper import fetch
from mainframe.events.constants import CATEGORY_BY_NAME
from mainframe.events.models import Event
from mainframe.sources.models import Source

logger = logging.getLogger(__name__)


def slugify(name):
    """Create a slug from name, handling diacritics and special characters."""
    if not name:
        return ""

    normalized = unicodedata.normalize("NFD", name)
    without_diacritics = "".join(
        char for char in normalized if unicodedata.category(char) != "Mn"
    )

    slug = without_diacritics.lower()

    # Replace spaces and special characters with dashes
    slug = re.sub(
        r"[^\w\s-]", "", slug
    )  # Remove non-word chars except spaces and dashes
    slug = re.sub(r"[\s_]+", "-", slug)  # Replace spaces/underscores with single dash
    slug = re.sub(r"-+", "-", slug)  # Replace multiple dashes with single dash
    slug = slug.strip("-")  # Remove leading/trailing dashes

    return slug


def parse_datetime(date_str):
    if not date_str:
        return None

    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo(settings.TIME_ZONE))
        return dt
    except ValueError:
        logger.warning("Could not parse datetime: %s", date_str)
        return None


class EventsClient:
    def __init__(self, source: Source):
        self.source = source
        self.session = requests.Session()

    def fetch_events(self, **kwargs):
        headers = self.source.headers
        path = self.source.config["url"]["path"]
        params = self.source.config["url"].get("params", {})
        params.update(kwargs)
        soup = self.source.config.get("soup", False)

        url = f"{self.source.url.rstrip('/')}/{path}"
        response, error = fetch(
            url,
            logger,
            headers=headers,
            params=params,
            soup=soup,
        )
        if error:
            logger.error(
                "[events][%s] Failed to fetch events from: %s. (%s)",
                self.source.name,
                url,
                error,
            )
            return []

        return self.parse_data(response.json() if not soup else response)

    def parse_data(self, data: dict) -> list[Event]:
        raise NotImplementedError


class EBClient(EventsClient):
    def parse_data(self, data: dict) -> list[Event]:
        events = []
        for event_data in data.get("events", {}).values():
            external_id = event_data.pop("id")

            city_name = event_data.pop("city_name", "")
            city_slug = event_data.pop("city_slug", "")
            if not city_slug and city_name:
                city_slug = slugify(city_name)

            location = event_data.pop("hall_name", "")
            location_slug = event_data.pop("hall_slug", "")
            if not location_slug and location:
                location_slug = slugify(location)

            event_slug = event_data.pop("event_slug", "")
            url = (
                f"{self.source.url.rstrip('/')}/{event_slug.lstrip('/')}"
                if event_slug
                else ""
            )

            title = event_data.pop("title", "")
            description = event_data.pop("subtitle", "")
            start_date = parse_datetime(event_data.pop("starting_date", None))
            end_date = parse_datetime(event_data.pop("ending_date", None))
            category_id = event_data.pop("category_id")

            events.append(
                Event(
                    source=self.source,
                    external_id=external_id,
                    title=title,
                    description=description or "",
                    start_date=start_date,
                    end_date=end_date,
                    location=location,
                    location_slug=location_slug,
                    city_name=city_name or "",
                    city_slug=city_slug or "",
                    category_id=category_id,
                    url=url,
                    additional_data=event_data,
                )
            )
        return events


class IBClient(EventsClient):
    def parse_data(self, data: dict) -> list[Event]:
        if data.get("error"):
            logger.error("Error in IB response: %s", data["error"])
            return []

        soup = BeautifulSoup(data["html"], features="html.parser")
        event_tags = [
            t
            for t in soup.select("script")
            if t.attrs.get("type") == "application/ld+json"
        ]
        return [self.parse_event(tag) for tag in event_tags if tag.text.strip()]

    def parse_event(self, tag):
        raw = json.loads(
            tag.text.strip().replace("/*<![CDATA[*/", "").replace("/*]]>*/", "").strip()
        )
        title = raw.pop("name")
        url = raw.pop("url")
        return Event(
            source=self.source,
            title=title,
            description=raw.pop("description"),
            start_date=raw.pop("startDate"),
            end_date=raw.pop("endDate"),
            location=raw["location"].pop("name"),
            city_name=raw["location"]["address"].pop("addressLocality"),
            category_id=CATEGORY_BY_NAME["music"]
            if "concert" in title
            else CATEGORY_BY_NAME["other"],
            url=url,
            external_id=url.rstrip("/").split("-")[-1],
            additional_data=raw,
        )


class ZnClient(EventsClient):
    def parse_data(self, soup) -> list[Event]:
        events = []
        marker = soup.find(string=self.source.config["soup"]["string"])
        if not marker:
            return events

        section = marker.find_parent("section")
        if not section:
            return events

        tags = section.select(self.source.config["soup"]["children"])
        for t in tags:
            tag = t.div
            category = tag.find("div", {"class": "kzn-sw-item-textsus"}).text.strip()
            title = tag.h3.a.text
            url = tag.h3.a["href"]
            description = tag.find("div", {"class": "kzn-sw-item-sumar"}).text.strip()
            date, time = tag.find("div", {"class": "kzn-one-event-date"}).select("div")
            start_date = datetime.strptime(
                f"{date.text.strip().split()[1]} {time.text.strip()}",
                "%d/%m %H:%M",
            )
            location = tag.find("div", {"class": "kzn-sw-item-adresa"}).text.strip()
            city_name = self.source.config["city_name"]
            city_slug = self.source.config["city_slug"]
            events.append(
                Event(
                    source=self.source,
                    title=title,
                    description=description,
                    start_date=start_date,
                    location=location,
                    city_name=city_name,
                    city_slug=city_slug,
                    category_id=CATEGORY_BY_NAME.get(category.lower(), 4),
                    url=url,
                    external_id=url.rstrip("/").split("-")[-1],
                )
            )
        return events
