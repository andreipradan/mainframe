import logging

import telegram
from django.core.management import BaseCommand

from clients.chat import send_telegram_message
from clients.logs import ManagementCommandsHandler
from watchers.models import Watcher


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--name", nargs="+", type=str, help="List of watcher names")

    def handle(self, *_, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        watchers = Watcher.objects.all()
        if names := options["name"]:
            watchers = watchers.filter(name__in=names)

        logger.info("Running watchers: %s", names if names else "all")
        for watcher in watchers:
            result = watcher.run()
            if isinstance(result, str):
                logger.error("[%s] Error: %s", watcher.name, result)
            elif result:
                send_telegram_message(
                    f"📣 <b>New {watcher.name} article</b> 📣\n"
                    f"<a href='{watcher.latest['url']}'>{watcher.latest['title']}</a>",
                    parse_mode=telegram.ParseMode.HTML,
                )
            else:
                logger.info("[%s] No new changes", watcher.name)
