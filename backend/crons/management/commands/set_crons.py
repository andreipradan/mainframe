import logging
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from clients.cron import set_crons
from core.settings import get_file_handler
from crons.models import Cron

logger = logging.getLogger(__name__)
logger.addHandler(get_file_handler(Path(__file__).stem))


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger.info(f"[Crons] Setting")
        crons = Cron.objects.filter(is_active=True)
        if not crons:
            raise CommandError("No active crons in the database")
        set_crons(crons, clear_all=True)
        self.stdout.write(self.style.SUCCESS("[Crons] Done."))
