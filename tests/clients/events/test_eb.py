from unittest import mock

import pytest
import requests

from mainframe.clients.events.eb import EBClient, slugify
from mainframe.events.models import Event
from tests.factories.source import SourceFactory


@pytest.mark.django_db
class TestEBClient:
    def setup_method(self):
        self.source = SourceFactory.create(name="EB", url="https://api.eb.example.com")

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

            client = EBClient(self.source)
            client.fetch_events()

            # Check that events were created
            assert Event.objects.count() == 3
            event1, event2, event3 = Event.objects.filter(source=self.source).order_by(
                "external_id"
            )

            assert event1.title == "Event 1"
            assert event1.location == "Location 1"
            assert event1.location_slug == "location-1"
            assert event1.city_slug == "san-francisco"
            assert event1.url == "https://api.eb.example.com/event-1"
            assert "extra_field" in event1.additional_data
            assert "id" not in event1.additional_data

            assert event2.city_name == "New York"
            assert event2.city_slug == "new-york"  # city_name converted to slug
            assert event2.url == "https://api.eb.example.com/event-2"

            assert event3.location_slug == "grand-hall-bucuresti"  # location slugified
            assert event3.city_name == "Transylvania"
            assert event3.city_slug == "transylvania"  # city_name converted to slug
            assert event3.url == "https://api.eb.example.com/event-3"

    def test_slugify(self):
        assert slugify("New York") == "new-york"
        assert slugify("București") == "bucuresti"
        assert slugify("Ștefan cel Mare") == "stefan-cel-mare"
        assert slugify("Târgu Mureș") == "targu-mures"
        assert slugify("St. Louis") == "st-louis"
        assert slugify("Los  Angeles") == "los-angeles"
        assert slugify("") == ""
        assert slugify(None) == ""
        assert slugify("san-francisco") == "san-francisco"
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

            client = EBClient(self.source)
            client.fetch_events(category_id=1, per_page=50, filters="upcoming")

            mock_get.assert_called_once_with(
                "https://api.eb.example.com/events",
                params={"category_id": 1, "per_page": 50, "filters": "upcoming"},
                timeout=30,
            )

            assert list(Event.objects.values_list("external_id", "title")) == [
                ("1", "Music Event 1")
            ]

    def test_fetch_events_api_error(self):
        with mock.patch("requests.Session.get") as mock_get:
            mock_get.side_effect = requests.RequestException("API Error")

            client = EBClient(self.source)
            with pytest.raises(requests.RequestException):
                client.fetch_events()
