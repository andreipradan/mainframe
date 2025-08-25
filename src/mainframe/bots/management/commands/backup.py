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
        """
        Create a timestamped JSON gzip dump of a Django app (or specific model), upload it to Google Cloud Storage, remove the local file, and ping a completion healthcheck.

        This command:
        - Runs `manage.py dumpdata` for the given app or `app.Model` (if `model` provided) and writes output to a timestamped file named `YYYY_MM_DD_HH_MM_SS.json.gz`.
        - Uploads that file to Google Cloud Storage under a destination path prefixed with `app_` and, if a model was given, `modelname_`.
        - Removes the local dump file.
        - Writes a success message to stdout and pings the healthcheck key `{APP}_BACKUP` (uppercase) only after the above steps complete.

        Parameters:
        - options (dict): Expected to contain:
            - "app" (str): Django app label to dump (required).
            - "model" (str): Optional model name within the app; if provided, used as `App.Model` for dumpdata and to add a model prefix in the storage path.

        Returns:
        - None

        Notes:
        - Side effects: creates a local dump file, uploads to cloud storage, deletes the local file, and pings an external healthcheck service.
        - Exceptions are not caught here and will propagate to the caller.
        """
        logger = logging.getLogger(__name__)

        app = options["app"]

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
        healthchecks.ping(logger, f"{app.upper()}_BACKUP")
