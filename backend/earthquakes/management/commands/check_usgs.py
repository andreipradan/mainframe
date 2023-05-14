import logging
from datetime import datetime, timedelta

import pytz
import requests

from clients.logs import get_handler
from earthquakes.management.commands.base_check import BaseEarthquakeCommand
from earthquakes.models import Earthquake


class Command(BaseEarthquakeCommand):
    logger = logging.getLogger(__name__)
    logger.addHandler(get_handler("management"))
    source = Earthquake.SOURCE_USGS
    url = r"https://earthquake.usgs.gov/fdsnws/event/1/query?"

    def add_arguments(self, parser):
        parser.add_argument("--minutes", type=int, help="Since how many minutes ago")

    def fetch(self, **options):
        since = datetime.now().astimezone(
            pytz.timezone("Europe/Bucharest")
        ) - timedelta(minutes=5)
        if options["minutes"]:
            since = datetime.now().astimezone(
                pytz.timezone("Europe/Bucharest")
            ) - timedelta(minutes=options["minutes"])
        elif latest := Earthquake.objects.order_by("-timestamp").first():
            since = latest.timestamp

        params = {
            "format": "geojson",
            "starttime": since,
            "latitude": 45.94320,
            "longitude": 24.96680,
            "maxradiuskm": 386.02,
            "minmagnitude": 2,
        }
        return requests.get(self.url, params=params, timeout=30)

    def fetch_events(self, response):
        return response.json()["features"]

    def parse_earthquake(self, event):
        props = event["properties"]
        long, lat, depth = event["geometry"]["coordinates"]
        return Earthquake(
            timestamp=datetime.fromtimestamp(props["time"] / 1000).astimezone(pytz.utc),
            depth=depth,
            intensity=None,
            latitude=lat,
            longitude=long,
            location=props["place"],
            magnitude=props["mag"],
            source=Earthquake.SOURCE_USGS,
        )
