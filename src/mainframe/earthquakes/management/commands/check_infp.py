import logging
from datetime import datetime

import pytz
from bs4 import BeautifulSoup
from django.conf import settings
from geopy.distance import geodesic
from geopy.point import Point

from mainframe.earthquakes.management.base_check import BaseEarthquakeCommand
from mainframe.earthquakes.models import Earthquake


class Command(BaseEarthquakeCommand):
    logger = logging.getLogger(__name__)

    source = Earthquake.SOURCE_INFP
    url = "https://dataportal.infp.ro/"

    @staticmethod
    def get_kwargs():
        return {"timeout": 10, "verify": False}

    @staticmethod
    def fetch_events(response):
        soup = BeautifulSoup(response.text, features="html.parser")
        return soup.html.body.find_all("div", {"class": "event-item"})

    @staticmethod
    def get_datetime(string):
        dt = datetime.strptime(f"{string}", "%Y-%m-%d %H:%M:%S")
        return pytz.timezone(settings.TIME_ZONE).localize(dt)

    @staticmethod
    def is_within_radius(point1, point2, radius_km):
        distance = geodesic(Point(point1), Point(point2)).km
        return distance <= radius_km

    def parse_earthquake(self, card: BeautifulSoup) -> Earthquake:
        timestamp = self.get_datetime(card.attrs["data-time"])
        additional_data = {
            x.span.attrs["title"]: x.text.strip()
            for x in card.find("div", {"class": "event-extras"}).ul.find_all("li")
            if x.span.attrs["title"] != "labels.latlon"
        }
        url, _, region, *__ = card.find("div", {"class": "event-data"}).find_all("div")
        additional_data["url"] = url.a.attrs["href"]
        region = region.text.strip()
        lat, lon = card.attrs["data-lat"], card.attrs["data-lon"]
        return Earthquake(
            timestamp=timestamp,
            depth=additional_data.pop("labels.depth").replace("km", ""),
            intensity=additional_data.pop("Intensitate epicentrala", ""),
            is_local=self.is_within_radius(
                settings.EARTHQUAKE_DEFAULT_COORDINATES,
                (lat, lon),
                self.default_max_radius,
            ),
            latitude=lat,
            longitude=lon,
            location=region,
            magnitude=card.attrs["data-magnitude"],
            source=Earthquake.SOURCE_INFP,
            additional_data={"external_id": card.attrs["data-id"]},
        )
