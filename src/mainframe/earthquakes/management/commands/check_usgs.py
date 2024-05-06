import logging
from datetime import datetime, timedelta

import pytz
import requests
from mainframe.clients.logs import ManagementCommandsHandler
from mainframe.earthquakes.management.commands.base_check import BaseEarthquakeCommand
from mainframe.earthquakes.models import Earthquake


class Command(BaseEarthquakeCommand):
    logger = logging.getLogger(__name__)
    logger.addHandler(ManagementCommandsHandler())
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
        elif (
            latest := Earthquake.objects.filter(source=Earthquake.SOURCE_USGS)
            .order_by("-timestamp")
            .first()
        ):
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

    def parse_earthquake(self, event) -> Earthquake:
        props = event["properties"]
        long, lat, depth = event["geometry"]["coordinates"]
        return Earthquake(
            timestamp=datetime.fromtimestamp(props["time"] / 1000).astimezone(pytz.utc),
            depth=depth,
            intensity="",
            latitude=lat,
            longitude=long,
            location=props["place"] or "N/A",
            magnitude=props["mag"],
            source=Earthquake.SOURCE_USGS,
        )
