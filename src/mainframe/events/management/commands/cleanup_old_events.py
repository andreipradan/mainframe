from datetime import datetime

import structlog
from django.core.management import BaseCommand
from django.db.models import Q
from django.utils import timezone

from mainframe.events.models import Event

logger = structlog.get_logger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger.info("Cleaning up all past events...")

        now = timezone.now()
        local_today_start = timezone.make_aware(
            datetime.combine(timezone.localtime(now).date(), datetime.min.time())
        )

        events_to_delete = list(
            Event.objects.filter(
                Q(end_date__lt=now)
                | Q(end_date__isnull=True, start_date__lt=local_today_start)
            ).values_list("id", flat=True)
        )
        if events_to_delete:
            Event.objects.filter(id__in=events_to_delete).delete()
            logger.info("Events deleted successfully!", count=len(events_to_delete))
        else:
            logger.warning("No past events found to delete")
