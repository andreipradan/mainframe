import logging

from django.core.management import call_command
from huey import crontab
from huey.contrib.djhuey import HUEY, db_periodic_task

from clients.logs import ManagementCommandsHandler

logger = logging.getLogger(__name__)
logger.addHandler(ManagementCommandsHandler())


@db_periodic_task(crontab(minute=0, hour=7))
@HUEY.lock_task("run-watchers-lock")
def run_watchers():
    call_command("run_watchers")
