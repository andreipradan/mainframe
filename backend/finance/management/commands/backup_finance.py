import logging

import telegram
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from clients import healthchecks
from clients.chat import send_telegram_message
from clients.logs import ManagementCommandsHandler
from clients.os import run_cmd
from clients.storage import upload_blob_from_file


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())
        healthchecks.ping("FINANCE_BACKUP", logger=logger)

        file_name = f"{timezone.now():%Y_%m_%d_%H_%M_%S}.json"
        call_command("dumpdata", "finance", output=file_name, verbosity=2)
        upload_blob_from_file(file_name, f"finance/{file_name}", logger)
        run_cmd(f"rm {file_name}")
        msg = f"[Finance] Backup complete: {file_name}"
        send_telegram_message(text=msg, parse_mode=telegram.ParseMode.HTML)
        logger.info(msg)
        self.stdout.write(self.style.SUCCESS(msg))
