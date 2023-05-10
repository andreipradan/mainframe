import logging
from pathlib import Path

import telegram
from django.core.management.base import BaseCommand

from clients.telegram import send_telegram_message
# from core.settings import get_file_handler

logger = logging.getLogger(__name__)
# logger.addHandler(get_file_handler(Path(__file__).stem))


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("message", type=str)

    def handle(self, *args, **options):
        msg = options["message"]
        logger.info(f"[Telegram] message: {msg}")
        try:
            send_telegram_message(text=msg)
        except telegram.TelegramError as e:
            logger.error(str(e))
        self.stdout.write(self.style.SUCCESS("[Telegram] Done."))
