import json

import pytest

from mainframe.clients.events import IBClient
from tests.factories.source import SourceFactory


@pytest.mark.django_db
class TestIBClient:
    def setup_method(self):
        self.source = SourceFactory.create(
            name="ib",
            url="https://www.ib.example.com",
            config={"url": {"path": "events"}},
        )

    def test_parse_event_from_jsonld(self):
        raw = {
            "name": "Indie Concert",
            "startDate": "2026-06-01",
            "endDate": "2026-06-02",
            "location": {
                "name": "Indie Hall",
                "address": {"addressLocality": "City Z"},
            },
            "url": "/event/indie-concert",
            "description": "Great gig",
            "id": "abc-123",
        }
        html = f'<script type="application/ld+json">{json.dumps(raw)}</script>'
        client = IBClient(self.source)

        events = client.parse_data({"html": html})

        assert len(events) == 1
        e = events[0]
        assert e.title == "Indie Concert"
        assert e.location == "Indie Hall"
        assert e.city == "City Z"
        assert e.url == "/event/indie-concert"
        assert e.categories == ["music"]

    def test_parse_event_error_response(self):
        client = IBClient(self.source)
        events = client.parse_data({"error": True})
        assert events == []
