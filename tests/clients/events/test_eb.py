from unittest import mock

import pytest
import requests

from mainframe.clients.events.eb import EBClient
from mainframe.events.models import Event


@pytest.mark.django_db
class TestEBClient:
    def test_fetch_events_success(self):
        mock_response_data = {
            "events": {
                "1": {
                    "id": "1",
                    "title": "Event 1",
                    "subtitle": "Description 1",
                    "starting_date": "2023-01-01T10:00:00Z",
                    "hall_name": "Location 1",
                },
                "2": {
                    "id": "2",
                    "title": "Event 2",
                    "subtitle": "Description 2",
                    "starting_date": "2023-01-02T11:00:00Z",
                    "hall_name": "Location 2",
                },
            }
        }

        with mock.patch("requests.Session.get") as mock_get:
            mock_response = mock.Mock()
            mock_response.json.return_value = mock_response_data
            mock_get.return_value = mock_response

            client = EBClient("https://api.eb.example.com")
            client.fetch_events()

            # Check that events were created
            assert Event.objects.count() == 2
            event1 = Event.objects.get(
                source=Event.SourceChoices.EB,
                external_id="1",
            )
            assert event1.title == "Event 1"
            assert event1.location == "Location 1"

    def test_fetch_events_with_category(self):
        mock_response_data = {
            "events": {
                "1": {
                    "id": "1",
                    "title": "Music Event 1",
                    "subtitle": "Description 1",
                    "starting_date": "2023-01-01T10:00:00Z",
                    "hall_name": "Location 1",
                }
            }
        }

        with mock.patch("requests.Session.get") as mock_get:
            mock_response = mock.Mock()
            mock_response.json.return_value = mock_response_data
            mock_get.return_value = mock_response

            client = EBClient("https://api.eb.example.com")
            client.fetch_events(category_id=1, per_page=50, filters="upcoming")

            # Check that the request was made with correct parameters
            mock_get.assert_called_once_with(
                "https://api.eb.example.com/events",
                params={"category_id": 1, "per_page": 50, "filters": "upcoming"},
                timeout=30,
            )

            # Check that event was created
            assert Event.objects.count() == 1
            event = Event.objects.get(source=Event.SourceChoices.EB, external_id="1")
            assert event.title == "Music Event 1"

    def test_fetch_events_api_error(self):
        with mock.patch("requests.Session.get") as mock_get:
            mock_get.side_effect = requests.RequestException("API Error")

            client = EBClient("https://api.eb.example.com")
            with pytest.raises(requests.RequestException):
                client.fetch_events()
