import logging

from django.core.management.base import BaseCommand

from clients import healthchecks
from clients.chat import send_telegram_message
from clients.cron import set_crons
from clients.logs import ManagementCommandsHandler
from crons.models import Cron


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        logger.info("[Crons] Setting")
        crons = Cron.objects.filter(is_active=True)
        if not crons:
            logger.error("No active crons in the database")
        set_crons(crons, clear_all=True)
        logger.info("[Crons] Done")

        if healthchecks.ping():
            logger.info("[Healthcheck] Done")
        send_telegram_message(text="[[backend]] up")
        self.stdout.write(self.style.SUCCESS("[Crons] Done."))
