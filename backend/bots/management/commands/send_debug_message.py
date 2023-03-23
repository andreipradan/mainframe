import logging

import telegram
from django.core.management.base import BaseCommand, CommandError

from bots.models import Bot

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("message", type=str)

    def handle(self, *args, **options):
        msg = options["message"]
        logger.info(f"Sending debug message: {msg}")
        try:
            bot = Bot.objects.get(additional_data__debug_chat_id__isnull=False)
        except Bot.DoesNotExist:
            raise CommandError(
                "Bot with debug_chat_id in additional data does not exist"
            )

        chat_id = bot.additional_data["debug_chat_id"]
        telegram.Bot(bot.token).send_message(
            chat_id=chat_id,
            disable_notification=True,
            disable_web_page_preview=True,
            text=msg,
            parse_mode=telegram.ParseMode.MARKDOWN,
        )
        self.stdout.write(self.style.SUCCESS("Done."))
