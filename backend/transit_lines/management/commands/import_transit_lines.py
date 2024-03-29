import logging

from django.core.management.base import BaseCommand, CommandError

from clients import healthchecks
from clients.chat import send_telegram_message
from clients.ctp import CTPClient, FetchTransitLinesException
from clients.logs import ManagementCommandsHandler
from transit_lines.models import Schedule, TransitLine

DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        logger.info("Importing transit lines")
        healthchecks.ping("transit")

        lines = []
        for line_type in [c[0] for c in TransitLine.LINE_TYPE_CHOICES]:
            try:
                lines.extend(CTPClient.fetch_lines(line_type, commit=False))
            except FetchTransitLinesException as e:
                raise CommandError(e)
        TransitLine.objects.bulk_create(
            lines,
            update_conflicts=True,
            update_fields=["car_type", "line_type", "terminal1", "terminal2"],
            unique_fields=["name"],
        )

        schedules = list(CTPClient.fetch_schedules(commit=False))
        Schedule.objects.bulk_create(
            schedules,
            update_conflicts=True,
            update_fields=[
                "terminal1_schedule",
                "terminal2_schedule",
                "schedule_start_date",
            ],
            unique_fields=list(*Schedule._meta.unique_together),
        )

        msg = f"Synced {len(lines)} transit lines and {len(schedules)} schedules"
        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS(msg))
