import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

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
            since = datetime.now().astimezone(ZoneInfo(settings.TIME_ZONE)) - timedelta(
                minutes=5
            )

        lat, long = settings.EARTHQUAKE_DEFAULT_COORDINATES
        return {
            "params": {
                "format": "geojson",
                "starttime": since,
                "latitude": lat,
                "longitude": long,
                "maxradiuskm": self.default_max_radius,
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
            timestamp=datetime.fromtimestamp(props["time"] / 1000).astimezone(
                ZoneInfo("UTC")
            ),
            depth=depth,
            intensity="",
            is_local=True,  # see get_kwargs -> filtering only for local events
            latitude=lat,
            longitude=long,
            location=props["place"] or "N/A",
            magnitude=props["mag"],
            source=Earthquake.SOURCE_USGS,
        )
