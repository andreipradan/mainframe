from unittest import mock

import pytest
from django.core.management import CommandError, call_command

from tests.factories.source import SourceFactory


@pytest.mark.django_db
class TestFetchEBEventsCommand:
    def setup_method(self):
        # Create a test source for EB
        self.source = SourceFactory.create(
            name="test_source", url="https://api.example.com"
        )

    @mock.patch("mainframe.events.management.commands.fetch_events.EBClient")
    def test_fetch_music_events(self, mock_client_class):
        mock_client = mock_client_class.return_value

        call_command("fetch_events", source="test_source", category="music")

        mock_client_class.assert_called_once_with(self.source)
        mock_client.fetch_events.assert_called_once_with(category_id=1)

    @mock.patch("mainframe.events.management.commands.fetch_events.EBClient")
    def test_fetch_sport_events(self, mock_client_class):
        mock_client = mock_client_class.return_value

        call_command("fetch_events", source="test_source", category="sport")

        mock_client_class.assert_called_once_with(self.source)
        mock_client.fetch_events.assert_called_once_with(category_id=2)

    @mock.patch("mainframe.events.management.commands.fetch_events.EBClient")
    def test_fetch_events_with_custom_options(self, mock_client_class):
        mock_client = mock_client_class.return_value

        call_command("fetch_events", source="test_source", category="film")

        mock_client_class.assert_called_once_with(self.source)
        mock_client.fetch_events.assert_called_once_with(category_id=3)

    def test_invalid_category(self):
        with pytest.raises(CommandError, match="Invalid category: invalid"):
            call_command("fetch_events", source="", category="invalid")
