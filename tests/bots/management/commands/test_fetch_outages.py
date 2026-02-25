from datetime import datetime
from unittest import mock
from zoneinfo import ZoneInfo

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings

from mainframe.bots.management.commands.fetch_outages import Outage


@pytest.mark.django_db
class TestFetchOutagesCommand:
    def test_invalid_url_raises(self):
        with pytest.raises(CommandError):
            call_command(
                "fetch_outages",
                "--branch",
                "Bucharest",
                "--url",
                "https://example.com/invalid-url",
            )

    @mock.patch("mainframe.bots.management.commands.fetch_outages.fetch")
    def test_fetch_error_raises(self, fetch_mock):
        fetch_mock.return_value = (None, "network error")
        with pytest.raises(CommandError):
            call_command(
                "fetch_outages",
                "--branch",
                "Bucharest",
                "--url",
                "https://example.com/0",
            )

    @override_settings(TIME_ZONE="Europe/Bucharest")
    @mock.patch("mainframe.bots.management.commands.fetch_outages.healthchecks.ping")
    @mock.patch("mainframe.bots.management.commands.fetch_outages.CalendarClient")
    @mock.patch("mainframe.bots.management.commands.fetch_outages.fetch")
    def test_no_matching_outages_clears_and_pings(
        self, fetch_mock, calendar_client_mock, ping_mock
    ):
        # response with an outage in a different county
        response = mock.MagicMock()
        response.json.return_value = [
            {
                "adresa": "Strada A<br />Strada B",
                "judet": "OtherCounty",
                "durataProgramare": "2h",
                "dataStop": "21/02/2026 14:00",
                "id": 123,
                "dataStart": "21/02/2026 12:00",
            }
        ]
        fetch_mock.return_value = (response, None)

        client_instance = mock.MagicMock()
        calendar_client_mock.return_value = client_instance

        call_command(
            "fetch_outages", "--branch", "Bucharest", "--url", "https://example.com/0"
        )

        client_instance.clear_events.assert_called_once_with(
            event_type=mock.ANY, branch="Bucharest"
        )
        client_instance.create_events.assert_not_called()
        ping_mock.assert_called_once()

    @override_settings(TIME_ZONE="Europe/Bucharest")
    @mock.patch("mainframe.bots.management.commands.fetch_outages.healthchecks.ping")
    @mock.patch("mainframe.bots.management.commands.fetch_outages.CalendarClient")
    @mock.patch("mainframe.bots.management.commands.fetch_outages.fetch")
    def test_creates_events_for_branch(
        self, fetch_mock, calendar_client_mock, ping_mock
    ):
        # response with an outage in the requested county
        response = mock.MagicMock()
        response.json.return_value = [
            {
                "adresa": "Main St<br />Second St",
                "judet": "Bucharest",
                "durataProgramare": "4h",
                "dataStop": "21/02/2026 18:00",
                "id": 555,
                "dataStart": "21/02/2026 14:00",
            }
        ]
        fetch_mock.return_value = (response, None)

        client_instance = mock.MagicMock()
        calendar_client_mock.return_value = client_instance

        call_command(
            "fetch_outages", "--branch", "Bucharest", "--url", "https://example.com/0"
        )

        # create_events should be called with a list containing at least one event dict
        assert client_instance.create_events.call_count == 1
        args, _ = client_instance.create_events.call_args
        assert args == (
            [
                Outage(
                    addresses=["Main St", "Second St"],
                    county="Bucharest",
                    duration="4h",
                    end=datetime(2026, 2, 21, 16, 0, tzinfo=ZoneInfo("UTC")),
                    external_id=555,
                    start=datetime(2026, 2, 21, 12, 0, tzinfo=ZoneInfo("UTC")),
                    type="Accidental",
                )
            ],
        )
        ping_mock.assert_called_once()
