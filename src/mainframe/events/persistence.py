import structlog
from django.db import DatabaseError

from mainframe.events.models import Event

logger = structlog.get_logger(__name__)

EVENT_UPDATE_FIELDS = [
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
]
EVENT_UNIQUE_FIELDS = ["location", "start_date", "url"]


def persist_events(events: list[Event], source_name: str) -> int:
    if not events:
        return 0

    try:
        Event.objects.bulk_create(
            events,
            update_conflicts=True,
            update_fields=EVENT_UPDATE_FIELDS,
            unique_fields=EVENT_UNIQUE_FIELDS,
        )
    except DatabaseError:
        logger.exception(
            "Failed to save events",
            source=source_name,
            count=len(events),
        )
        raise

    return len(events)
