import logging
import re
import unicodedata
from datetime import datetime
from urllib.parse import urljoin, urlparse, urlunparse
from zoneinfo import ZoneInfo

import requests
from django.conf import settings

from mainframe.events.models import Event
from mainframe.sources.models import Source

logger = logging.getLogger(__name__)


def slugify(name):
    """Create a slug from name, handling diacritics and special characters."""
    if not name:
        return ""

    normalized = unicodedata.normalize("NFD", name)
    # Remove diacritical marks
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


class EBClient:
    def __init__(self, source: Source):
        self.source = source
        self.session = requests.Session()

    def fetch_events(self, **kwargs):
        if "filters" not in kwargs:
            kwargs["filters"] = "upcoming"
        if "per_page" not in kwargs:
            kwargs["per_page"] = 100

        try:
            response = self.session.get(
                f"{self.source.url}/events",
                params=kwargs,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            events_data = data.get("events", {})

            if isinstance(events_data, dict):
                events_list = events_data.values()
            else:
                events_list = events_data

            events_to_create = []
            for event_data in events_list:
                event = self._create_event_instance(event_data)
                if event:
                    events_to_create.append(event)

            if events_to_create:
                Event.objects.bulk_create(
                    events_to_create,
                    update_conflicts=True,
                    update_fields=[
                        "title",
                        "description",
                        "start_date",
                        "end_date",
                        "location",
                        "location_slug",
                        "city_name",
                        "city_slug",
                        "url",
                        "additional_data",
                        "updated_at",
                    ],
                    unique_fields=["source", "external_id"],
                )
                logger.info(
                    "Successfully bulk created/updated %d events", len(events_to_create)
                )
            else:
                logger.info("No valid events to save")

        except requests.RequestException as e:
            logger.error("Failed to fetch events from EB: %s", e)
            raise

    def _create_event_instance(self, event_data):
        external_id = event_data.pop("id")
        if not external_id:
            logger.warning("Event data missing ID, skipping")
            return None

        city_name = event_data.pop("city_name", "")
        city_slug = event_data.pop("city_slug", "")
        if not city_slug and city_name:
            city_slug = slugify(city_name)

        location = event_data.pop("hall_name", "")
        location_slug = event_data.pop("hall_slug", "")
        if not location_slug and location:
            location_slug = slugify(location)

        event_slug = event_data.pop("event_slug", "")
        if event_slug:
            parsed = urlparse(self.source.url)
            path = urljoin(parsed.path, event_slug) if parsed.path else event_slug
            url = urlunparse(
                (
                    parsed.scheme,
                    parsed.netloc,
                    path,
                    parsed.params,
                    parsed.query,
                    parsed.fragment,
                )
            )
        else:
            url = ""

        title = event_data.pop("title", "")
        description = event_data.pop("subtitle", "")
        start_date = parse_datetime(event_data.pop("starting_date", None))
        end_date = parse_datetime(event_data.pop("ending_date", None))

        return Event(
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
            url=url,
            additional_data=event_data,
        )
