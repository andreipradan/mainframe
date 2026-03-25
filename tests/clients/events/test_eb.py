from unittest import mock

import pytest
import requests

from mainframe.clients.events.eb import EBClient, slugify
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
                    "hall_slug": "location-1",
                    "city_slug": "san-francisco",
                    "event_slug": "event-1",
                    "extra_field": "should_be_in_additional_data",
                },
                "2": {
                    "id": "2",
                    "title": "Event 2",
                    "subtitle": "Description 2",
                    "starting_date": "2023-01-02T11:00:00Z",
                    "hall_name": "Location 2",
                    "city_name": "New York",
                    "event_slug": "event-2",
                },
                "3": {
                    "id": "3",
                    "title": "Event 3",
                    "subtitle": "Description 3",
                    "starting_date": "2023-01-03T12:00:00Z",
                    "hall_name": "Grand Hall București",
                    "city_name": "Transylvania",
                    "event_slug": "event-3",
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
            assert Event.objects.count() == 3
            event1 = Event.objects.get(
                source=Event.SourceChoices.EB,
                external_id="1",
            )
            assert event1.title == "Event 1"
            assert event1.location == "Location 1"
            assert event1.location_slug == "location-1"
            assert event1.city_slug == "san-francisco"
            assert event1.url == "https://api.eb.example.com/event-1"
            assert "extra_field" in event1.additional_data
            assert "id" not in event1.additional_data

            event2 = Event.objects.get(
                source=Event.SourceChoices.EB,
                external_id="2",
            )
            assert event2.city_name == "New York"
            assert event2.city_slug == "new-york"  # city_name converted to slug
            assert event2.url == "https://api.eb.example.com/event-2"

            event3 = Event.objects.get(
                source=Event.SourceChoices.EB,
                external_id="3",
            )
            assert event3.location_slug == "grand-hall-bucuresti"  # location slugified
            assert event3.city_name == "Transylvania"
            assert event3.city_slug == "transylvania"  # city_name converted to slug
            assert event3.url == "https://api.eb.example.com/event-3"

    def test_slugify(self):
        # Test basic slug creation
        assert slugify("New York") == "new-york"

        # Test diacritics removal
        assert slugify("București") == "bucuresti"
        assert slugify("Ștefan cel Mare") == "stefan-cel-mare"
        assert slugify("Târgu Mureș") == "targu-mures"

        # Test special characters and multiple spaces
        assert slugify("St. Louis") == "st-louis"
        assert slugify("Los  Angeles") == "los-angeles"

        # Test empty and None
        assert slugify("") == ""
        assert slugify(None) == ""

        # Test already slug-like strings
        assert slugify("san-francisco") == "san-francisco"

        # Test location-like strings
        assert slugify("Grand Hall București") == "grand-hall-bucuresti"

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
