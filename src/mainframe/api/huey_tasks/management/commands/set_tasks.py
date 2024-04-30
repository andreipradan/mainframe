import logging

from django.core.management import BaseCommand
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.logs import ManagementCommandsHandler
from mainframe.crons.models import Cron, schedule_cron
from mainframe.watchers.models import Watcher, schedule_watcher


class Command(BaseCommand):
    def handle(self, *_, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        logger.info("[Set tasks] Setting tasks for all watchers with crons")
        for watcher in Watcher.objects.exclude(cron=""):
            schedule_watcher(watcher)
            logger.info("[Set tasks] watcher set: %s", watcher.name)

        for cron in Cron.objects.all():
            schedule_cron(cron)
            logger.info("[Set tasks] cron set: %s", cron.command)

        send_telegram_message(text="[[huey]] up")
        logger.info("[Set tasks] Done")
