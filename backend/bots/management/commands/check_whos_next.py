import logging

from django.core.management.base import BaseCommand, CommandError

from bots.models import Bot
from clients.logs import ManagementCommandsHandler


def whos_next():
    bot = Bot.objects.get(additional_data__whos_next__isnull=False)

    config = bot.additional_data["whos_next"]
    if not isinstance(config, dict) or not (chat_id := config.get("chat_id")):
        raise CommandError("chat_id missing from whos_next in bot additional data")
    if not (post_order := config.get("post_order")):
        raise CommandError("post_order missing from whos_next in bot additional data")
    if not isinstance(post_order, list):
        raise CommandError("post_order not a list")
    if len(post_order) < 2:
        raise CommandError("post_order contains less than 2 items")

    if config["posted"]:
        prev, current, _ = post_order
    else:
        current, _, prev = post_order

    msg = (
        f"A fost: <b>{prev}</b>\nUrmează: <b>{current}</b>\n"
        f"{config['theme']}\n"
        f"Mai multe <a href='{config['url']}'>aici</a>"
    )

    return msg, bot, chat_id


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())
        logger.info("Checking who's next")

        msg, bot, chat_id = whos_next()
        bot.send_message(chat_id=chat_id, text=msg)
        self.stdout.write(self.style.SUCCESS("Done."))
