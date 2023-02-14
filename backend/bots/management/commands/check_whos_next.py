import logging
import datetime

import telegram
from django.core.management.base import BaseCommand, CommandError

from bots.models import Bot

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger.info("Checking who's next")
        bot = Bot.objects.get(additional_data__whos_next__isnull=False)

        if not isinstance(whos_next, dict) or not (chat_id := whos_next.get("chat_id")):
            raise CommandError("chat_id missing from whos_next in bot additional data")
        if not whos_next.get("post_order") or not isinstance(
            whos_next.get("post_order"), list
        ):
            raise CommandError(
                "post_order missing from whos_next in bot additional data or not of type list"
            )
        if not (start_date := whos_next.get("start_date")):
            raise CommandError(
                "start_date missing from whos_next in bot additional data"
            )

        post_order = whos_next["post_order"]
        start_date = datetime.datetime.strptime(start_date, "%d.%m.%Y").date()
        tomorrow = datetime.datetime.now().date() + datetime.timedelta(days=1)
        next_person = post_order[(tomorrow - start_date).days % 3]

        msg = f"Se pregătește pentru mâine: {next_person}"
        logger.info(msg)

        telegram.Bot(bot.token).send_message(
            chat_id=chat_id,
            text=msg,
            disable_notification=True,
            disable_web_page_preview=True,
        )
        self.stdout.write(self.style.SUCCESS("Done."))
