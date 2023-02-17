import logging
from datetime import datetime

import pytz
import requests
from bs4 import BeautifulSoup

from earthquakes.management.commands.base_check import BaseEarthquakeCommand
from earthquakes.models import Earthquake


class Command(BaseEarthquakeCommand):
    logger = logging.getLogger(__name__)
    source = Earthquake.SOURCE_INFP
    url = "http://n1.infp.ro/"

    @property
    def prefix(self):
        return f"[{self.source.upper()}]"

    def fetch(self, **options):
        return requests.get(self.url, timeout=45)

    def fetch_events(self, response):
        soup = BeautifulSoup(response.text, features="html.parser")
        return soup.html.body.find_all("div", {"class": "card"})

    def get_datetime(self, string):
        date, time, tz = string.split()
        return datetime.strptime(f"{date} {time}", "%d.%m.%Y, %H:%M:%S").replace(
            tzinfo=pytz.timezone(tz)
        )

    def parse_earthquake(self, card):
        body = card.find("div", {"class": "card-body"})
        text, *rest = body.find_all("p")
        lat = (
            body.find("span", {"title": "Latitudine"})
            .text.strip("\n Latitudine")
            .strip(" °N")
        )
        long = (
            body.find("span", {"title": "Longitudine"})
            .text.strip("\n Longitudine")
            .strip(" °E")
        )
        magnitude, *location = (
            card.find("div", {"class": "card-footer"}).text.strip().split(", ")
        )
        timestamp = (
            card.find("div", {"class": "card-header"})
            .text.replace("Loading...", "")
            .strip()
        )
        return Earthquake(
            timestamp=self.get_datetime(timestamp),
            depth=text.text.strip().split("la adâncimea de ")[1][:-1].split(" ")[0],
            intensity=rest[0].text.strip().split()[1] if len(rest) > 1 else None,
            latitude=lat,
            longitude=long,
            location=",".join(location),
            magnitude=magnitude.split()[1],
            source=Earthquake.SOURCE_INFP,
        )
