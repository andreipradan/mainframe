import logging

import telegram
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone
from mainframe.clients import healthchecks
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.logs import ManagementCommandsHandler
from mainframe.clients.storage import upload_blob_from_file
from mainframe.clients.system import run_cmd


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--app", type=str, required=True)
        parser.add_argument("--model", type=str, default="")

    def handle(self, *_, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        app = options["app"]
        healthchecks.ping(f"{app.upper()}_BACKUP", logger=logger)

        file_name = f"{timezone.now():%Y_%m_%d_%H_%M_%S}.json.gz"

        model = options["model"]
        source = app if not model else f"{app}.{model.title()}"
        logger.info("Dumping '%s%s' data", source, f".{model}" if model else "")

        call_command("dumpdata", source, output=file_name, verbosity=2)

        destination = f"{app}/{f'{model.lower()}/' if model else ''}{file_name}"

        upload_blob_from_file(file_name, destination, logger)
        run_cmd(f"rm {file_name}")
        msg = f"[{app.title()}] Backup complete: {destination}"
        send_telegram_message(text=msg, parse_mode=telegram.ParseMode.HTML)
        logger.info(msg)
        self.stdout.write(self.style.SUCCESS(msg))
