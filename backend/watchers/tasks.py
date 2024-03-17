import logging

from django.core.management import call_command
from huey import crontab
from huey.contrib.djhuey import HUEY, db_periodic_task, db_task

from clients.logs import ManagementCommandsHandler
from watchers.models import Watcher

logger = logging.getLogger(__name__)
logger.addHandler(ManagementCommandsHandler())


@db_task(expires=30)
def run_watcher(watcher_id):
    call_command("run_watcher", args=[watcher_id])


@db_periodic_task(crontab(minute=0, hour=7))
@HUEY.lock_task("run-watchers-lock")
def run_watchers():
    watchers = Watcher.objects.filter(is_active=True)
    for watcher in watchers:
        run_watcher(watcher.id)
