from unittest import mock

import pytest
import requests

from mainframe.clients.events import EBClient, slugify
from tests.factories.source import SourceFactory


@pytest.mark.django_db
class TestEBClient:
    def setup_method(self):
        self.source = SourceFactory.create(
            name="EB",
            url="https://api.eb.example.com",
            config={"url": {"path": "events"}},
        )

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
                    "category_id": 1,
                },
                "2": {
                    "id": "2",
                    "title": "Event 2",
                    "subtitle": "Description 2",
                    "starting_date": "2023-01-02T11:00:00Z",
                    "hall_name": "Location 2",
                    "city_name": "City Beta",
                    "event_slug": "event-2",
                    "category_id": 1,
                },
                "3": {
                    "id": "3",
                    "title": "Event 3",
                    "subtitle": "Description 3",
                    "starting_date": "2023-01-03T12:00:00Z",
                    "hall_name": "Grand Hall Omega",
                    "city_name": "Region X",
                    "event_slug": "event-3",
                    "category_id": 1,
                },
            }
        }

        with mock.patch("mainframe.clients.events.fetch") as mock_fetch:
            mock_response = mock.Mock()
            mock_response.json.return_value = mock_response_data
            mock_fetch.return_value = (mock_response, None)

            client = EBClient(self.source)
            events = client.fetch_events(category_id=1)

            # Check that events were returned
            assert len(events) == 3
            event1, event2, event3 = sorted(events, key=lambda e: e.external_id)

            assert event1.title == "Event 1"
            assert event1.location == "Location 1"
            assert event1.location_slug == "location-1"
            assert event1.city_slug == "san-francisco"
            assert event1.url == "https://api.eb.example.com/event-1"
            assert "extra_field" in event1.additional_data
            assert "id" not in event1.additional_data

            assert event2.city_name == "City Beta"
            assert event2.city_slug == "city-beta"  # city_name converted to slug
            assert event2.url == "https://api.eb.example.com/event-2"

            assert event3.location_slug == "grand-hall-omega"  # location slugified
            assert event3.city_name == "Region X"
            assert event3.city_slug == "region-x"  # city_name converted to slug
            assert event3.url == "https://api.eb.example.com/event-3"

    def test_slugify(self):
        assert slugify("City Beta") == "city-beta"
        assert slugify("Metropolis") == "metropolis"
        assert slugify("Master Plaza") == "master-plaza"
        assert slugify("Alpha-1 Station") == "alpha-1-station"
        assert slugify("St. Event") == "st-event"
        assert slugify("East  Gate") == "east-gate"
        assert slugify("") == ""
        assert slugify(None) == ""
        assert slugify("city-alpha") == "city-alpha"
        assert slugify("Grand Hall Omega") == "grand-hall-omega"

    def test_fetch_events_with_category(self):
        mock_response_data = {
            "events": {
                "1": {
                    "id": "1",
                    "title": "Music Event 1",
                    "subtitle": "Description 1",
                    "starting_date": "2023-01-01T10:00:00Z",
                    "hall_name": "Location 1",
                    "category_id": 1,
                    "event_slug": "event-1",
                }
            }
        }

        with mock.patch("mainframe.clients.events.fetch") as mock_fetch:
            mock_response = mock.Mock()
            mock_response.json.return_value = mock_response_data
            mock_fetch.return_value = (mock_response, None)

            client = EBClient(self.source)
            events = client.fetch_events(category_id=1, per_page=50, filters="upcoming")

            assert [(e.external_id, e.title) for e in events] == [
                ("1", "Music Event 1")
            ]

    def test_fetch_events_api_error(self):
        with mock.patch("mainframe.clients.events.fetch") as mock_fetch:
            mock_fetch.return_value = (None, requests.RequestException("API Error"))

            client = EBClient(self.source)
            events = client.fetch_events(category_id=1)

            assert events == []
