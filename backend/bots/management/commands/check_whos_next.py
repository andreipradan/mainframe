import datetime
import logging

from django.core.management.base import BaseCommand, CommandError

from bots.models import Bot
from clients.logs import ManagementCommandsHandler


def whos_next(bot):
    whos_next = bot.additional_data["whos_next"]
    if not isinstance(whos_next, dict) or not (chat_id := whos_next.get("chat_id")):
        raise CommandError("chat_id missing from whos_next in bot additional data")
    if not whos_next.get("post_order") or not isinstance(
        whos_next.get("post_order"), list
    ):
        raise CommandError(
            "post_order missing from whos_next in bot additional data "
            "or not of type list"
        )
    if not (start_date := whos_next.get("start_date")):
        raise CommandError("start_date missing from whos_next in bot additional data")

    post_order = whos_next["post_order"]
    start_date = datetime.datetime.strptime(start_date, "%d.%m.%Y").date()
    tomorrow = datetime.datetime.now().date() + datetime.timedelta(days=1)

    days = (tomorrow - start_date).days
    today, tomorrow = post_order[(days - 1) % 3], post_order[days % 3]
    msg = f"Today: {today}\nSe pregătește pentru mâine: {tomorrow}"
    return msg, chat_id


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        logger.info("Checking who's next")
        bot = Bot.objects.get(additional_data__whos_next__isnull=False)

        msg, chat_id = whos_next(bot)

        bot.send_message(
            chat_id=chat_id,
            text=msg,
            disable_notification=True,
            disable_web_page_preview=True,
        )
        self.stdout.write(self.style.SUCCESS("Done."))
