import logging

from django.core.management import BaseCommand
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.logs import ManagementCommandsHandler
from mainframe.core.tasks import schedule_task
from mainframe.crons.models import Cron
from mainframe.watchers.models import Watcher


class Command(BaseCommand):
    def handle(self, *_, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        logger.info("[Set tasks] Setting tasks for all crons and watchers")

        for cron in Cron.objects.filter(is_active=True):
            schedule_task(cron)

        for watcher in Watcher.objects.exclude(cron=""):
            schedule_task(watcher)

        send_telegram_message(text="[[huey]] up")
        logger.info("[Set tasks] Done")
