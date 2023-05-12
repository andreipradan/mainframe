import logging
from datetime import datetime
from pathlib import Path

import pytz
import requests
from bs4 import BeautifulSoup

from core.settings import get_file_handler
from earthquakes.management.commands.base_check import BaseEarthquakeCommand
from earthquakes.models import Earthquake


class Command(BaseEarthquakeCommand):
    logger = logging.getLogger(__name__)
    logger.addHandler(get_file_handler(Path(__file__).stem))
    source = Earthquake.SOURCE_INFP
    url = "https://dataportal.infp.ro/?proximityMax=2"

    def fetch(self, **options):
        return requests.get(self.url, timeout=30, verify=False)

    def fetch_events(self, response):
        soup = BeautifulSoup(response.text, features="html.parser")
        return soup.html.body.find_all("div", {"class": "event-item"})

    def parse_earthquake(self, card):
        intensity = card.find("span", {"title": "Intensitate epicentrala"})
        timestamp = datetime.strptime(card.attrs["data-time"], "%Y-%m-%d %H:%M:%S")
        return Earthquake(
            timestamp=timestamp.replace(tzinfo=pytz.utc),
            depth=card.find("span", {"title": "labels.depth"})
            .text.strip()
            .replace("km", ""),
            intensity=intensity.text.strip() if intensity else None,
            latitude=card.attrs["data-lat"],
            longitude=card.attrs["data-lon"],
            location=card.find("span").text.strip(),
            magnitude=card.attrs["data-magnitude"],
            source=Earthquake.SOURCE_INFP,
        )
