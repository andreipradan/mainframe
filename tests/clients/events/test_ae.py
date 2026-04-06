from unittest import mock

import pytest

from mainframe.clients.events import AEClient
from tests.factories.source import SourceFactory


@pytest.mark.django_db
class TestAEClient:
    def setup_method(self):
        self.source = SourceFactory.create(
            name="ae",
            url="https://api.ae.example.com",
            config={"url": {"path": "data"}},
        )

    def test_fetch_events_success(self):
        mock_response_data = {
            "data": [
                {
                    "eventname": "Concert A",
                    "categories": ["Concert"],
                    "location": "Venue A",
                    "start_time": "1650000000",
                    "end_time": "1650003600",
                    "event_url": "/event/concert-a",
                    "venue": {"city": "City Alpha"},
                    "event_id": "100",
                    "extra": "keep_me",
                }
            ]
        }

        with mock.patch("mainframe.clients.events.fetch") as mock_fetch:
            mock_response = mock.Mock()
            mock_response.json.return_value = mock_response_data
            mock_fetch.return_value = (mock_response, None)

            client = AEClient(self.source)
            events = client.fetch_events()

            assert len(events) == 1
            e = events[0]
            assert e.title == "Concert A"
            assert e.location == "Venue A"
            assert e.categories == ["music"]
            assert e.url == "/event/concert-a"
            assert e.city == "City Alpha"
            assert e.external_id == "100"
            assert e.additional_data.get("extra") == "keep_me"

    def test_fetch_events_api_error(self):
        with mock.patch("mainframe.clients.events.fetch") as mock_fetch:
            mock_fetch.return_value = (None, Exception("Network"))

            client = AEClient(self.source)
            events = client.fetch_events()

            assert events == []
