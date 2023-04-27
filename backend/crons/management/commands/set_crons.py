import logging
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from clients.cron import set_crons
from core.settings import get_file_handler
from crons.models import Cron

logger = logging.getLogger(__name__)
logger.addHandler(get_file_handler(Path(__file__).stem))


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "--post-deploy",
            action="store_true",
            default=False,
            dest="post_deploy",
        )

    def handle(self, *args, **options):
        crons = Cron.objects.filter(is_active=True)
        if not crons:
            raise CommandError("No active crons in the database")
        set_crons(crons, clear_all=options["post_deploy"])
        self.stdout.write(self.style.SUCCESS("Done."))
