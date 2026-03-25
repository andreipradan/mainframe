from unittest import mock

import pytest
from django.core.management import CommandError, call_command

from tests.factories.source import SourceFactory


@pytest.mark.django_db
class TestFetchEBEventsCommand:
    def setup_method(self):
        # Create a test source for EB
        self.source = SourceFactory.create(name="eb", url="https://api.example.com")

    @mock.patch("mainframe.events.management.commands.fetch_events.CLIENT_MAPPING")
    def test_fetch_music_events(self, mock_mapping):
        mock_client_class = mock.MagicMock()
        mock_client = mock.MagicMock()
        mock_client_class.return_value = mock_client
        mock_mapping.get.return_value = mock_client_class

        call_command("fetch_events", source="eb", category="music")

        mock_client_class.assert_called_once_with(self.source)
        mock_client.fetch_events.assert_called_once_with(category_id=1)

    @mock.patch("mainframe.events.management.commands.fetch_events.CLIENT_MAPPING")
    def test_fetch_sport_events(self, mock_mapping):
        mock_client_class = mock.MagicMock()
        mock_client = mock.MagicMock()
        mock_client_class.return_value = mock_client
        mock_mapping.get.return_value = mock_client_class

        call_command("fetch_events", source="eb", category="sport")

        mock_client_class.assert_called_once_with(self.source)
        mock_client.fetch_events.assert_called_once_with(category_id=2)

    @mock.patch("mainframe.events.management.commands.fetch_events.CLIENT_MAPPING")
    def test_fetch_events_with_custom_options(self, mock_mapping):
        mock_client_class = mock.MagicMock()
        mock_client = mock.MagicMock()
        mock_client_class.return_value = mock_client
        mock_mapping.get.return_value = mock_client_class

        call_command("fetch_events", source="eb", category="film")

        mock_client_class.assert_called_once_with(self.source)
        mock_client.fetch_events.assert_called_once_with(category_id=3)

    def test_invalid_category(self):
        with pytest.raises(CommandError, match="Invalid category: invalid"):
            call_command("fetch_events", source="", category="invalid")
