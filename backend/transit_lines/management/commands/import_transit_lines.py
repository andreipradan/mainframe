import logging

from django.core.management.base import BaseCommand, CommandError

from bots.models import Bot
from clients.ctp import CTPClient, FetchTransitLinesException
from transit_lines.models import TransitLine, Schedule

logger = logging.getLogger(__name__)

DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger.info("Importing transit lines")

        lines = []
        for line_type in ["urban", "metropolitan"]:
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

        msg = f"Synced {len(lines)} transit lines and {len(list(schedules))} schedules"
        bot = Bot.objects.get(additional_data__debug_chat_id__isnull=False)
        bot.send_message(chat_id=bot.additional_data["debug_chat_id"], text=msg)
        self.stdout.write(self.style.SUCCESS(msg))
