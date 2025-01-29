import logging
from datetime import datetime

import pytz
from bs4 import BeautifulSoup

from mainframe.earthquakes.management.base_check import BaseEarthquakeCommand
from mainframe.earthquakes.models import Earthquake


class Command(BaseEarthquakeCommand):
    logger = logging.getLogger(__name__)

    source = Earthquake.SOURCE_INFP
    url = "http://n1.infp.ro/"

    def get_kwargs(self):
        return {"timeout": 10, "verify": False}

    @staticmethod
    def fetch_events(response):
        soup = BeautifulSoup(response.text, features="html.parser")
        return soup.html.body.find_all("div", {"class": "card"})

    @staticmethod
    def get_datetime(string):
        date, time, tz = string.split()
        dt = datetime.strptime(f"{date} {time}", "%d.%m.%Y, %H:%M:%S")
        return pytz.timezone(tz).localize(dt)

    def parse_earthquake(self, card) -> Earthquake:
        body = card.find("div", {"class": "card-body"})
        text, *rest = body.find_all("p")
        lat = (
            body.find("span", {"title": "Latitudine"})
            .text.removeprefix("\n Latitudine ")
            .removesuffix(" °N\n")
        )
        long = (
            body.find("span", {"title": "Longitudine"})
            .text.removeprefix("\n Longitudine")
            .removesuffix(" °E\n")
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
            intensity=rest[0].text.strip().split()[1] if len(rest) > 1 else "",
            latitude=lat,
            longitude=long,
            location=",".join(location),
            magnitude=magnitude.split()[1],
            source=Earthquake.SOURCE_INFP,
        )
