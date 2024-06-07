from django.core.management.base import BaseCommand, CommandError
from mainframe.clients import healthchecks
from mainframe.clients.ctp import CTPClient, FetchTransitLinesException
from mainframe.clients.logs import get_default_logger
from mainframe.transit_lines.models import Schedule, TransitLine

DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = get_default_logger(__name__, management=True)

        logger.info("Importing transit lines")
        healthchecks.ping(logger, "transit")

        lines = []
        client = CTPClient(logger=logger)
        for line_type in [c[0] for c in TransitLine.LINE_TYPE_CHOICES]:
            try:
                lines.extend(client.fetch_lines(line_type, commit=False))
            except FetchTransitLinesException as e:
                raise CommandError(e) from e
        TransitLine.objects.bulk_create(
            lines,
            update_conflicts=True,
            update_fields=["car_type", "line_type", "terminal1", "terminal2"],
            unique_fields=["name"],
        )

        schedules = list(client.fetch_schedules(commit=False))
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
        logger.info(msg)
        self.stdout.write(self.style.SUCCESS(msg))
