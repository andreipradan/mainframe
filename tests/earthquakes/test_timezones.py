from datetime import datetime
from decimal import Decimal
from unittest import mock
from zoneinfo import ZoneInfo

import pytest
from bs4 import BeautifulSoup
from django.test import override_settings

from mainframe.earthquakes.management.base_check import (
    DATETIME_FORMAT,
    BaseEarthquakeCommand,
    normalize_coordinates,
)
from mainframe.earthquakes.management.commands.check_infp import Command as InfpCommand
from mainframe.earthquakes.management.commands.check_usgs import Command as UsgsCommand
from mainframe.earthquakes.models import Earthquake


@override_settings(TIME_ZONE="Europe/Bucharest")
def test_check_infp_get_datetime_uses_zoneinfo():
    dt = InfpCommand.get_datetime("2026-02-21 12:00:00")
    assert dt.tzinfo == ZoneInfo("Europe/Bucharest")


def test_check_infp_uses_default_tls_verification():
    assert InfpCommand.get_kwargs() == {"timeout": 10}


def test_check_infp_parse_earthquake_rejects_missing_event_extras():
    card = BeautifulSoup(
        '<div data-time="2026-02-21 12:00:00">'
        '<div class="event-data"><div></div><div></div><div></div></div>'
        "</div>",
        "html.parser",
    ).div
    command = InfpCommand()

    with pytest.raises(ValueError, match="missing event extras"):
        command.parse_earthquake(card)


@override_settings(EARTHQUAKE_DEFAULT_COORDINATES=(45.12345, -122.67891))
def test_check_infp_parse_earthquake_normalizes_string_coordinates():
    card = BeautifulSoup(
        """
        <div class="event-item" data-time="2026-02-21 12:00:00"
             data-lat="45.12345" data-lon="-122.67891"
             data-magnitude="4.2" data-id="123">
          <div class="event-data">
            <div><a href="https://example.com">Place</a></div>
            <div></div>
            <div>Region</div>
          </div>
          <div class="event-extras">
            <ul>
              <li><span title="labels.depth"></span>10km</li>
              <li><span title="Intensitate epicentrala"></span>III</li>
            </ul>
          </div>
        </div>
        """,
        "html.parser",
    ).div

    parsed = InfpCommand().parse_earthquake(card)

    assert normalize_coordinates(parsed.latitude, parsed.longitude) == (
        Decimal("45.12345"),
        Decimal("-122.67891"),
    )


def make_usgs_event(timestamp_ms: int):
    return {
        "properties": {"time": timestamp_ms, "place": "Somewhere", "mag": 4.2},
        "geometry": {"coordinates": [45.12345, 45.12345, 10]},
    }


def test_check_usgs_parse_earthquake_timestamp_utc():
    # 1700000000000 ms is a fixed timestamp
    evt = make_usgs_event(1700000000000)
    parsed = UsgsCommand.parse_earthquake(evt)
    assert parsed.timestamp.tzinfo == ZoneInfo("UTC")


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    (
        (45.12345, -122.67891),
        ("45.12345", "-122.67891"),
    ),
)
def test_normalize_coordinates_uses_stored_decimal_precision(latitude, longitude):
    assert normalize_coordinates(latitude, longitude) == (
        Decimal("45.12345"),
        Decimal("-122.67891"),
    )


@pytest.mark.django_db
@override_settings(EARTHQUAKE_DEFAULT_COORDINATES=(0, 0))
def test_base_check_does_not_notify_for_an_existing_usgs_event():
    event_timestamp_ms = 1700000000000
    event = make_usgs_event(event_timestamp_ms)
    parsed_event = UsgsCommand.parse_earthquake(event)
    bot = mock.MagicMock()
    bot.additional_data = {
        "earthquake": {"min_magnitude": 2, "last_check": {}},
    }
    response = mock.MagicMock()
    response.json.return_value = {"features": [event]}

    with (
        mock.patch(
            "mainframe.earthquakes.management.base_check.Bot.objects.get",
            return_value=bot,
        ),
        mock.patch(
            "mainframe.earthquakes.management.base_check.fetch",
            return_value=(response, None),
        ),
        mock.patch(
            "mainframe.earthquakes.management.base_check.healthchecks.ping",
        ),
        mock.patch(
            "mainframe.earthquakes.management.base_check.send_telegram_message",
        ) as send_message,
    ):
        UsgsCommand().handle()
        UsgsCommand().handle()

    assert (
        Earthquake.objects.filter(
            source=parsed_event.source,
            timestamp=parsed_event.timestamp,
        ).count()
        == 1
    )
    send_message.assert_called_once()


@pytest.mark.django_db
@override_settings(EARTHQUAKE_DEFAULT_COORDINATES=(0, 0))
def test_base_check_retries_unsuccessful_telegram_notification():
    event_timestamp_ms = 1700000000000
    event = make_usgs_event(event_timestamp_ms)
    bot = mock.MagicMock()
    bot.additional_data = {
        "earthquake": {"min_magnitude": 2, "last_check": {}},
    }
    response = mock.MagicMock()
    response.json.return_value = {"features": [event]}

    with (
        mock.patch(
            "mainframe.earthquakes.management.base_check.Bot.objects.get",
            return_value=bot,
        ),
        mock.patch(
            "mainframe.earthquakes.management.base_check.fetch",
            return_value=(response, None),
        ),
        mock.patch(
            "mainframe.earthquakes.management.base_check.healthchecks.ping",
        ),
        mock.patch(
            "mainframe.earthquakes.management.base_check.send_telegram_message",
            side_effect=(None, mock.MagicMock(), mock.MagicMock()),
        ) as send_message,
    ):
        command = UsgsCommand()
        command.handle()
        command.handle()
        command.handle()

    assert send_message.call_count == 2


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
