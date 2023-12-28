import logging

import telegram
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from clients import healthchecks
from clients.chat import send_telegram_message
from clients.cron import remove_crons_for_command
from clients.logs import ManagementCommandsHandler
from clients.storage import upload_blob_from_file
from clients.system import run_cmd
from crons.models import Cron


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--model", type=str, default="")

    def handle(self, *_, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())
        healthchecks.ping("FINANCE_BACKUP", logger=logger)

        file_name = f"{timezone.now():%Y_%m_%d_%H_%M_%S}.json.gz"

        model = options["model"]
        source = "finance" if not model else f"finance.{model.title()}"
        logger.info("Dumping '%s' data", source)

        call_command("dumpdata", source, output=file_name, verbosity=2)

        destination = f"finance{f'_{model.lower()}' if model else ''}_{file_name}"
        upload_blob_from_file(file_name, destination, logger)
        run_cmd(f"rm {file_name}")
        msg = f"[Finance] Backup complete: {destination}"
        send_telegram_message(text=msg, parse_mode=telegram.ParseMode.HTML)
        logger.info(msg)
        self.stdout.write(self.style.SUCCESS(msg))

        cmd_suffix = f" --model={model}" if model else ""
        if settings.ENV == "prod":
            remove_crons_for_command(
                Cron(command=f"backup_finance{cmd_suffix}", is_management=True)
            )
