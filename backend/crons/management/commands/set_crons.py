from django.core.management.base import BaseCommand, CommandError

from clients.cron import set_crons
from crons.models import Cron


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
