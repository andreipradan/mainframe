from unittest import mock

import pytest
from django.core.management import CommandError, call_command


@pytest.mark.django_db
class TestFetchEBEventsCommand:
    @mock.patch("mainframe.events.management.commands.fetch_eb.EBClient")
    def test_fetch_music_events(self, mock_client_class):
        mock_client = mock_client_class.return_value

        call_command("fetch_eb", "music")

        mock_client_class.assert_called_once_with(None)
        mock_client.fetch_events.assert_called_once_with(category_id=1)

    @mock.patch("mainframe.events.management.commands.fetch_eb.EBClient")
    def test_fetch_sport_events(self, mock_client_class):
        mock_client = mock_client_class.return_value

        call_command("fetch_eb", "sport")

        mock_client_class.assert_called_once_with(None)
        mock_client.fetch_events.assert_called_once_with(category_id=2)

    @mock.patch("mainframe.events.management.commands.fetch_eb.EBClient")
    def test_fetch_events_with_custom_options(self, mock_client_class):
        mock_client = mock_client_class.return_value

        call_command(
            "fetch_eb",
            "film",
            api_url="https://custom.api.com",
        )

        mock_client_class.assert_called_once_with("https://custom.api.com")
        mock_client.fetch_events.assert_called_once_with(category_id=3)

    def test_invalid_category(self):
        with pytest.raises(CommandError, match="invalid choice"):
            call_command("fetch_eb", "invalid")
