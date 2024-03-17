import logging
from urllib.parse import urljoin

import requests
import telegram
from bs4 import BeautifulSoup
from django.core.management import BaseCommand

from clients.chat import send_telegram_message
from clients.logs import ManagementCommandsHandler
from watchers.models import Watcher


def run_watcher(watcher: Watcher):
    response = requests.get(watcher.url, timeout=10, **watcher.request)
    if response.status_code != 200:  # noqa: PLR2004
        return f"Request failed with status code {response.status_code}"

    soup = BeautifulSoup(response.text, "html.parser")
    elements = soup.select(watcher.selector)
    if not elements:
        return f"Watcher {watcher.name} did not found any elements"

    if watcher.latest["title"] != (found := elements[0]).text:
        watcher.latest = {
            "title": found.text,
            "url": urljoin(watcher.url, found.attrs["href"])
            if found.attrs["href"].startswith("/")
            else found.attrs["href"],
        }
        watcher.save()
        return True
    return False


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--ids", nargs="+", type=int, help="List of watcher IDs")

    def handle(self, *_, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        watchers = Watcher.objects.filter(id__in=options["ids"])

        for watcher in watchers:
            result = run_watcher(watcher)
            if isinstance(result, str):
                logger.error(result)
            elif result:
                send_telegram_message(
                    f"📣 <b>New {watcher.name} article</b> 📣\n"
                    f"<a href='{watcher.latest['url']}'>{watcher.latest['title']}</a>",
                    parse_mode=telegram.ParseMode.HTML,
                )
            else:
                logger.info("No new changes")
