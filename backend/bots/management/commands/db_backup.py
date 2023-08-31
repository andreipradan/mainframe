import logging

import environ
from django.core.management.base import BaseCommand
from django.utils import timezone

from clients import healthchecks
from clients.logs import ManagementCommandsHandler
from clients.os import run_cmd
from clients.storage import upload_blob_from_file


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())
        healthchecks.ping("DB_BACKUP", logger=logger)

        config = environ.Env()
        file_name = f"{timezone.now():%Y_%m_%d_%H_%M_%S}_mainframe_dump.sql"
        cmd = (
            f"{config('PG_DUMP_PATH')}/pg_dump "
            "--column-insert --data-only "
            f"-U {config('DB_USER')} -p {config('DB_PORT')} -h {config('DB_HOST')} "
            f"{config('DB_DATABASE')} -f {file_name}"
        )
        run_cmd(cmd, logger=logger, env={"PGPASSWORD": config("DB_PASSWORD")})
        upload_blob_from_file(file_name, file_name, logger)
        run_cmd(f"rm {file_name}")
