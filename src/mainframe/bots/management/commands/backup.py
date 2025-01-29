import logging

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone
from mainframe.clients import healthchecks
from mainframe.clients.storage import GoogleCloudStorageClient
from mainframe.clients.system import run_cmd


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--app", type=str, required=True)
        parser.add_argument("--model", type=str, default="")

    def handle(self, *_, **options):
        logger = logging.getLogger(__name__)

        app = options["app"]
        healthchecks.ping(logger, f"{app.upper()}_BACKUP")

        file_name = f"{timezone.now():%Y_%m_%d_%H_%M_%S}.json.gz"

        model = options["model"]
        source = app if not model else f"{app}.{model.title()}"
        call_command("dumpdata", source, output=file_name, verbosity=2)

        destination = f"{app}_{f'{model.lower()}_' if model else ''}{file_name}"
        client = GoogleCloudStorageClient(logger)
        client.upload_blob_from_file(file_name, destination)
        run_cmd(f"rm {file_name}")
        logger.info("Done")
        self.stdout.write(self.style.SUCCESS("Done"))
