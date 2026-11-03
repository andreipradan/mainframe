from datetime import datetime
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup
from django.conf import settings
from django.core.management import BaseCommand
from geopy.distance import geodesic
from geopy.point import Point

from mainframe.earthquakes.management.base_check import BaseEarthquakeCommand
from mainframe.earthquakes.models import Earthquake


class Command(BaseEarthquakeCommand, BaseCommand):
    source = Earthquake.SOURCE_INFP
    url = "https://dataportal.infp.ro/"

    @staticmethod
    def get_kwargs():
        return {"timeout": 10}

    @staticmethod
    def fetch_events(response):
        soup = BeautifulSoup(response.text, features="html.parser")
        return soup.html.body.find_all("div", {"class": "event-item"})

    @staticmethod
    def get_datetime(string):
        dt = datetime.strptime(f"{string}", "%Y-%m-%d %H:%M:%S")
        return dt.replace(tzinfo=ZoneInfo(settings.TIME_ZONE))

    @staticmethod
    def is_within_radius(point1, point2, radius_km):
        distance = geodesic(Point(point1), Point(point2)).km
        return distance <= radius_km

    def parse_earthquake(self, card: BeautifulSoup) -> Earthquake:
        timestamp = self.get_datetime(card.attrs["data-time"])
        event_data = card.find("div", {"class": "event-data"})
        if event_data is None:
            raise ValueError("INFP earthquake is missing event data")
        event_divs = event_data.find_all("div")
        minimum_event_divs = 3
        if len(event_divs) < minimum_event_divs:
            raise ValueError("INFP earthquake event data is incomplete")

        event_extras = card.find("div", {"class": "event-extras"})
        if event_extras is None:
            raise ValueError("INFP earthquake is missing event extras")
        extras_list = event_extras.find("ul")
        if extras_list is None:
            raise ValueError("INFP earthquake is missing event extras")
        additional_data = {
            x.span.attrs["title"]: x.text.strip()
            for x in extras_list.find_all("li")
            if x.span.attrs["title"] != "labels.latlon"
        }
        url, _, region, *__ = event_divs
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
