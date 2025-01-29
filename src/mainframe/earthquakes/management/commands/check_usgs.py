import logging
from datetime import datetime, timedelta

import pytz
from django.conf import settings
from mainframe.earthquakes.management.base_check import BaseEarthquakeCommand
from mainframe.earthquakes.models import Earthquake


class Command(BaseEarthquakeCommand):
    logger = logging.getLogger(__name__)

    source = Earthquake.SOURCE_USGS
    url = r"https://earthquake.usgs.gov/fdsnws/event/1/query?"

    def get_kwargs(self):
        if (
            latest := Earthquake.objects.filter(source=Earthquake.SOURCE_USGS)
            .order_by("-timestamp")
            .first()
        ):
            since = latest.timestamp
        else:
            since = datetime.now().astimezone(
                pytz.timezone(settings.TIME_ZONE)
            ) - timedelta(minutes=5)

        return {
            "params": {
                "format": "geojson",
                "starttime": since,
                "latitude": 45.94320,
                "longitude": 24.96680,
                "maxradiuskm": 386.02,
                "minmagnitude": 2,
            },
            "timeout": 30,
        }

    @staticmethod
    def fetch_events(response):
        return response.json()["features"]

    @staticmethod
    def parse_earthquake(event) -> Earthquake:
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
