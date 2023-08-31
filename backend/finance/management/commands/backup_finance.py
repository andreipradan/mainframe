import logging

import telegram
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from clients import healthchecks
from clients.chat import send_telegram_message
from clients.cron import remove_crons_for_command
from clients.logs import ManagementCommandsHandler
from clients.os import run_cmd
from clients.storage import upload_blob_from_file
from crons.models import Cron


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--model", type=str, default="")

    def handle(self, *args, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())
        healthchecks.ping("FINANCE_BACKUP", logger=logger)

        file_name = f"{timezone.now():%Y_%m_%d_%H_%M_%S}.json.gz"

        model = options["model"]
        source = "finance" if not model else f"finance.{model.title()}"
        logger.info(f"Dumping '{source}' data")

        call_command("dumpdata", source, output=file_name, verbosity=2)

        destination = f"finance{f'/{model}' if model else ''}/{file_name}"
        upload_blob_from_file(file_name, destination, logger)
        run_cmd(f"rm {file_name}")
        msg = f"[Finance] Backup complete: {destination}"
        send_telegram_message(text=msg, parse_mode=telegram.ParseMode.HTML)
        logger.info(msg)
        self.stdout.write(self.style.SUCCESS(msg))

        cmd_suffix = f" --model={model}" if model else ""
        remove_crons_for_command(
            Cron(command=f"backup_finance{cmd_suffix}", is_management=True)
        )
