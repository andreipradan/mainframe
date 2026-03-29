import json
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup
from django.conf import settings

from mainframe.clients.scraper import fetch
from mainframe.events.constants import (
    CATEGORY_NAME_BY_ID,
    get_category,
)
from mainframe.events.models import Event
from mainframe.sources.models import Source

logger = logging.getLogger(__name__)


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
            event_slug = event_data["event_slug"]
            url = f"{self.source.url.rstrip('/')}/{event_slug.lstrip('/')}"
            location_url = (
                f"{self.source.url.rstrip('/')}/hall/{event_data.pop('hall_slug')}"
            )

            start_date = parse_datetime(event_data.pop("starting_date"))
            end_date = parse_datetime(event_data.pop("ending_date"))

            events.append(
                Event(
                    source=self.source,
                    title=event_data.pop("title"),
                    category=CATEGORY_NAME_BY_ID[event_data.pop("category_id")],
                    location=event_data.pop("hall_name", ""),
                    start_date=start_date,
                    url=url,
                    city=event_data.pop("city_name") or "",
                    description=event_data.pop("subtitle") or "",
                    end_date=end_date,
                    external_id=event_data.pop("id"),
                    location_url=location_url,
                    additional_data={k: v for k, v in event_data.items() if v},
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
        return Event(
            source=self.source,
            title=title,
            category="music" if "concert" in title.lower() else "other",
            location=raw["location"].pop("name"),
            start_date=datetime.strptime(raw.pop("startDate"), "%Y-%m-%d").replace(
                tzinfo=ZoneInfo(settings.TIME_ZONE)
            ),
            url=raw.pop("url"),
            city=raw["location"]["address"].pop("addressLocality"),
            description=raw.pop("description"),
            end_date=datetime.strptime(raw.pop("endDate"), "%Y-%m-%d").replace(
                tzinfo=ZoneInfo(settings.TIME_ZONE)
            ),
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
            title = tag.h3.a.text.strip()
            url = tag.h3.a["href"]
            description = tag.find("div", {"class": "kzn-sw-item-sumar"}).text.strip()
            date, time = tag.find("div", {"class": "kzn-one-event-date"}).select("div")
            start_date = datetime.strptime(
                f"{date.text.strip().split()[1]} {time.text.strip()}",
                "%d/%m %H:%M",
            ).replace(year=datetime.now().year, tzinfo=ZoneInfo(settings.TIME_ZONE))
            location_tag = tag.find("div", {"class": "kzn-sw-item-adresa"})
            city = self.source.config["city"].lower()
            if location_tag.text.strip().lower() == city and " @ " in title:
                location = title.split("@")[-1].strip()
            else:
                location = location_tag.text.strip()
            events.append(
                Event(
                    source=self.source,
                    title=title,
                    category=get_category(category),
                    location=location,
                    start_date=start_date,
                    url=url,
                    city=self.source.config["city"],
                    description=description if description != title else "",
                    location_url=location_tag.a["href"] if location_tag.a else "",
                )
            )
        return events
