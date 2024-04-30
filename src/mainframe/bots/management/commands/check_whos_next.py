import logging

from django.core.management.base import BaseCommand, CommandError
from mainframe.bots.models import Bot
from mainframe.clients.logs import ManagementCommandsHandler


def whos_next(config):
    if not isinstance(config, dict):
        raise CommandError("Invalid whos_next config")
    if not (post_order := config.get("post_order")):
        raise CommandError("post_order missing from whos_next in bot additional data")
    if not isinstance(post_order, list):
        raise CommandError("post_order not a list")
    if len(post_order) != 3:  # noqa: PLR2004
        raise CommandError("post_order must contain 3 items")

    if posted := config.get("posted"):
        prev, current, _ = post_order
    else:
        current, _, prev = post_order

    if config.get("initial"):
        previous_msg = "Pfuui...no bun. Incepe: "
    else:
        previous_msg = f"A fost: <b>{prev}</b>\nUrmează: "

    msg = f"{previous_msg}<b>{current}</b>"
    theme = config.get("theme")
    if theme:
        msg += f"\n{theme}"
        if posted:
            msg += "\nNoua tema se anunta la 9 PM"
    if url := config.get("url"):
        msg += f"\nMai multe <a href='{url}'>aici</a>"
    return msg


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())
        logger.info("Checking who's next")

        bot = Bot.objects.get(additional_data__whos_next__isnull=False)
        config = bot.additional_data["whos_next"]
        if not (chat_id := config.get("chat_id")):
            raise CommandError("Missing chat_id in whos_next config")
        bot.send_message(chat_id=chat_id, text=whos_next(config))
        self.stdout.write(self.style.SUCCESS("Done."))
