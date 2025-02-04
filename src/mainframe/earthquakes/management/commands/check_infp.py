import logging
from datetime import datetime

import pytz
from django.conf import settings

from mainframe.earthquakes.management.base_check import BaseEarthquakeCommand
from mainframe.earthquakes.models import Earthquake


class Command(BaseEarthquakeCommand):
    logger = logging.getLogger(__name__)

    source = Earthquake.SOURCE_INFP
    url = "http://infp.ro/events.json"

    def get_kwargs(self):
        return {"timeout": 10, "verify": False}

    @staticmethod
    def fetch_events(response):
        return response.json()

    @staticmethod
    def get_datetime(string, dt_format="%d.%m.%Y, %H:%M:%S"):
        date, time, tz = string.split()
        dt = datetime.strptime(f"{date} {time}", dt_format)
        return pytz.timezone(tz).localize(dt)

    def parse_earthquake(self, card) -> Earthquake:
        dt = f"{card['date']} {card['time']} {settings.TIME_ZONE}"
        return Earthquake(
            timestamp=self.get_datetime(dt, "%Y/%m/%d %H:%M:%S.%f"),
            depth=card["depth"],
            intensity=card.get("intensity", ""),
            latitude=card["lat"],
            longitude=card["lon"],
            location=card["region"],
            magnitude=card["mag"],
            source=Earthquake.SOURCE_INFP,
            additional_data={"mag_type": card["mag_type"]},
        )
