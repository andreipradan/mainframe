import logging
from datetime import datetime

import requests

from mainframe.events.models import Event

logger = logging.getLogger(__name__)


class EBClient:
    def __init__(self, api_url, api_key=None):
        self.api_url = api_url
        self.session = requests.Session()

    def fetch_events(self, **kwargs):
        try:
            response = self.session.get(f"{self.api_url}/events", params=kwargs)
            response.raise_for_status()
            data = response.json()
            events_data = data.get("events", {})

            # Handle both dict format {"id": {...}} and list format [...]
            if isinstance(events_data, dict):
                events_list = events_data.values()
            else:
                events_list = events_data

            # Collect all valid events for bulk operation
            events_to_create = []
            for event_data in events_list:
                event = self._create_event_instance(event_data)
                if event:
                    events_to_create.append(event)

            if events_to_create:
                # Bulk create/update events
                Event.objects.bulk_create(
                    events_to_create,
                    update_conflicts=True,
                    update_fields=[
                        "title",
                        "description",
                        "start_date",
                        "end_date",
                        "location",
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
        external_id = event_data.get("id")
        if not external_id:
            logger.warning("Event data missing ID, skipping")
            return None

        return Event(
            source=Event.SourceChoices.EB,
            external_id=external_id,
            title=event_data.get("title", ""),
            description=event_data.get("subtitle") or "",
            start_date=self._parse_datetime(event_data.get("starting_date")),
            end_date=self._parse_datetime(event_data.get("ending_date")),
            location=event_data.get("hall_name", ""),
            additional_data=event_data,
        )

    def _parse_datetime(self, date_str):
        if not date_str:
            return None
        # Assuming ISO format, adjust as needed
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except ValueError:
            logger.warning("Could not parse datetime: %s", date_str)
            return None
