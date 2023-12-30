import logging
from datetime import datetime

import environ
import pytz
import requests
from requests import Response
from sentry_sdk.crons import monitor

from clients.logs import ManagementCommandsHandler
from earthquakes.management.commands.base_check import BaseEarthquakeCommand
from earthquakes.models import Earthquake


class Command(BaseEarthquakeCommand):
    logger = logging.getLogger(__name__)
    logger.addHandler(ManagementCommandsHandler())
    source = Earthquake.SOURCE_INFP
    url = "https://web.infp.ro/quakes"

    @monitor(monitor_slug=environ.Env()("SENTRY_INFP"))
    def handle(self, *args, **options):
        super().handle(*args, **options)

    def fetch(self, **__):
        return requests.get(self.url, timeout=30, verify=False)

    def fetch_events(self, response: Response):
        return [
            r
            for r in response.json()["result"]
            if r["sols"]["primary"]["magnitudes"]["primary"]["value"] > 2
        ]

    def get_datetime(self, string):
        return pytz.utc.localize(datetime.fromisoformat(string))

    def parse_earthquake(self, result: dict) -> Earthquake:
        if result["_id"] == result["id"]:
            result.pop("_id")

        primary = result["sols"]["primary"]
        location = primary["region"].pop("name")
        timestamp = self.get_datetime(primary.pop("time"))
        depth = primary.pop("depth")
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
