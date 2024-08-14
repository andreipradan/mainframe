from datetime import datetime

import pytz
import requests
from mainframe.clients.logs import get_default_logger
from mainframe.earthquakes.management.commands.base_check import BaseEarthquakeCommand
from mainframe.earthquakes.models import Earthquake
from requests import Response


class Command(BaseEarthquakeCommand):
    logger = get_default_logger(__name__)

    source = Earthquake.SOURCE_INFP
    url = "https://web.infp.ro/quakes"

    def handle(self, *args, **options):
        super().handle(*args, **options)

    def fetch(self, **__):
        return requests.get(self.url, timeout=30, verify=False)  # noqa S501

    def fetch_events(self, response: Response):
        magnitude_2 = 2
        return [
            r
            for r in response.json()["result"]
            if r["sols"]["primary"]["magnitudes"]["primary"]["value"] >= magnitude_2
        ]

    def get_datetime(self, string):
        return pytz.utc.localize(datetime.fromisoformat(string))

    def parse_earthquake(self, result: dict) -> Earthquake:
        if result["_id"] == result["id"]:
            result.pop("_id")

        primary = result["sols"]["primary"]
        location = primary.get("region", {}).pop("name", "<Missing region>")
        timestamp = self.get_datetime(primary.pop("time"))
        depth = primary.pop("depth") / 1000
        magnitude = primary["magnitudes"]["primary"].pop("value")
        long, lat = primary["lonlat"].pop("coordinates")
        if not primary["lonlat"]:
            primary.pop("lonlat")
        additional_data = result
        return Earthquake(
            additional_data=additional_data,
            timestamp=timestamp,
            depth=depth,
            latitude=lat,
            longitude=long,
            location=location,
            magnitude=magnitude,
            source=Earthquake.SOURCE_INFP,
        )
