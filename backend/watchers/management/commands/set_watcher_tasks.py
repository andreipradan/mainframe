import logging

from django.core.management import BaseCommand

from clients.chat import send_telegram_message
from clients.logs import ManagementCommandsHandler
from watchers.models import Watcher, schedule_watcher


class Command(BaseCommand):
    def handle(self, *_, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        logger.info("[Set watcher tasks] Setting tasks for all watchers with crons")
        for watcher in Watcher.objects.exclude(cron=""):
            schedule_watcher(watcher)
            logger.info("[Set watcher tasks] %s - set", watcher.name)
        send_telegram_message(text="[[huey]] up")
        logger.info("[Set watcher tasks] Done")