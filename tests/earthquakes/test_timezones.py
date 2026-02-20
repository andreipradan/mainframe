from datetime import datetime
from zoneinfo import ZoneInfo

from django.test import override_settings

from mainframe.earthquakes.management.base_check import (
    DATETIME_FORMAT,
    BaseEarthquakeCommand,
)
from mainframe.earthquakes.management.commands.check_infp import Command as InfpCommand
from mainframe.earthquakes.management.commands.check_usgs import Command as UsgsCommand


@override_settings(TIME_ZONE="Europe/Bucharest")
def test_check_infp_get_datetime_uses_zoneinfo():
    dt = InfpCommand.get_datetime("2026-02-21 12:00:00")
    assert dt.tzinfo == ZoneInfo("Europe/Bucharest")


def make_usgs_event(timestamp_ms: int):
    return {
        "properties": {"time": timestamp_ms, "place": "Somewhere", "mag": 4.2},
        "geometry": {"coordinates": [0, 0, 10]},
    }


def test_check_usgs_parse_earthquake_timestamp_utc():
    # 1700000000000 ms is a fixed timestamp
    evt = make_usgs_event(1700000000000)
    parsed = UsgsCommand.parse_earthquake(evt)
    assert parsed.timestamp.tzinfo == ZoneInfo("UTC")


def test_base_check_set_last_check_formats_datetime():
    class DummyCmd(BaseEarthquakeCommand):
        source = "TEST_SRC"

    cmd = DummyCmd()

    class FakeInstance:
        def __init__(self):
            self.additional_data = {"earthquake": {"last_check": {}}}

        def save(self):
            self._saved = True

    inst = FakeInstance()
    cmd.set_last_check(inst)
    stored = inst.additional_data["earthquake"]["last_check"][cmd.source]
    # Ensure it parses with the expected format (includes timezone offset)
    parsed = datetime.strptime(stored, DATETIME_FORMAT)
    assert parsed.tzinfo is not None
