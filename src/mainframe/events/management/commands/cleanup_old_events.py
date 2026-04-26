from datetime import datetime, timezone

import structlog
from django.core.management import BaseCommand
from django.db.models import Q

from mainframe.events.models import Event

logger = structlog.get_logger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger.info("Cleaning up all past events...")

        events_to_delete = list(
            Event.objects.filter(
                Q(end_date__lt=datetime.now(timezone.utc))
                | Q(
                    end_date__isnull=True,
                    start_date__lt=datetime.now(timezone.utc),
                )
            ).values_list("id", flat=True)
        )
        if events_to_delete:
            Event.objects.filter(id__in=events_to_delete).delete()
            logger.info("Events deleted successfully!", count=len(events_to_delete))
        else:
            logger.warning("No past events found to delete")
