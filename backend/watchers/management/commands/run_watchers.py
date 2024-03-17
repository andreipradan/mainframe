import logging

import requests
from bs4 import BeautifulSoup
from django.core.management import BaseCommand

from clients.logs import ManagementCommandsHandler
from watchers.models import Watcher


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--ids", nargs="+", type=int, help="List of watcher IDs")

    def handle(self, *_, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        watchers = Watcher.objects.filter(id__in=options["ids"])

        for watcher in watchers:
            print(watcher)
            response = requests.get(watcher.url, timeout=10, **watcher.request)
            if response.status_code != 200:  # noqa: PLR2004
                return logger.error(
                    "Watcher request failed with status code %s", response.status_code
                )
            soup = BeautifulSoup(response.text, "html.parser")
            elements = soup.select(watcher.selector)
            if not elements:
                return logger.error(
                    "Watcher %s did not found any elements", watcher.name
                )

            if watcher.latest["title"] != (found := elements[0]).text:
                print("Found new item")
                watcher.latest = {"title": found.text, "url": found.attrs["href"]}
                watcher.save()
            else:
                print(f"No new item for {watcher.name}")
