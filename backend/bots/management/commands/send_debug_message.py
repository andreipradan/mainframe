import logging

import environ
import telegram
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("message", type=str)

    def handle(self, *args, **options):
        msg = options["message"]
        logger.info(f"Sending debug message: {msg}")
        telegram.Bot(environ.Env()("DEBUG_TOKEN")).send_message(
            chat_id=environ.Env()("DEBUG_CHAT_ID"),
            disable_notification=True,
            disable_web_page_preview=True,
            text=msg,
            parse_mode=telegram.ParseMode.MARKDOWN,
        )
        self.stdout.write(self.style.SUCCESS("Done."))
