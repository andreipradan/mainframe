from unittest import mock

import pytest
from bs4 import BeautifulSoup

from mainframe.clients.events import ZnClient
from tests.factories.source import SourceFactory


@pytest.mark.django_db
class TestZnClient:
    def setup_method(self):
        self.source = SourceFactory.create(name="Zn", url="https://example.com")

    def test_parse_event_with_full_data(self):
        html = """
        <div class="event">
            <h2 class="title">Concert Rock</h2>
            <div class="description">Un concert extraordinar</div>
            <time datetime="2026-06-15T20:00:00+03:00">15 iunie 2026, 20:00</time>
            <div class="location">Sala Polivalentă Cluj</div>
            <a href="/event/concert-rock">Detalii</a>
        </div>
        """
        soup = BeautifulSoup(html, 'html.parser')
        element = soup.select_one('.event')
        
        client = ZnClient(self.source)
        event = client.parse_event(element)
        
        assert event.title == "Concert Rock"
        assert event.description == "Un concert extraordinar"
        assert event.location == "Sala Polivalentă Cluj"
        assert event.location_slug == "sala-polivalenta-cluj"
        assert event.city_name == "Cluj-Napoca"
        assert event.city_slug == "cluj-napoca"
        assert event.url == "https://example.com/event/concert-rock"
        assert event.external_id is not None

    def test_parse_event_minimal_data(self):
        html = """
        <div class="event-item">
            <h3>Festival de Vară</h3>
            <p>Descriere festival</p>
        </div>
        """
        soup = BeautifulSoup(html, 'html.parser')
        element = soup.select_one('.event-item')
        
        client = ZnClient(self.source)
        event = client.parse_event(element)
        
        assert event.title == "Festival de Vară"
        assert event.description == "Descriere festival"
        assert event.location == ""
        assert event.start_date is None

    def test_parse_data_with_multiple_events(self):
        html = """
        <div class="events-container">
            <div class="event">
                <h2>Event 1</h2>
                <time datetime="2026-01-01T10:00:00Z"></time>
            </div>
            <div class="event">
                <h2>Event 2</h2>
                <time datetime="2026-01-02T11:00:00Z"></time>
            </div>
        </div>
        """
        soup = BeautifulSoup(html, 'html.parser')
        
        client = ZnClient(self.source)
        events = client.parse_data(soup)
        
        assert len(events) == 2
        assert events[0].title == "Event 1"
        assert events[1].title == "Event 2"

    def test_parse_data_no_events(self):
        html = "<div>No events here</div>"
        soup = BeautifulSoup(html, 'html.parser')
        
        client = ZnClient(self.source)
        events = client.parse_data(soup)
        
        assert len(events) == 0

    @mock.patch("mainframe.clients.events.fetch")
    def test_fetch_events_success(self, mock_fetch):
        html = """
        <div class="event">
            <h2>Test Event</h2>
            <time datetime="2026-01-01T10:00:00Z"></time>
        </div>
        """
        soup = BeautifulSoup(html, 'html.parser')
        mock_fetch.return_value = (soup, None)
        
        client = ZnClient(self.source)
        events = client.fetch_events()
        
        assert len(events) == 1
        assert events[0].title == "Test Event"
        mock_fetch.assert_called_once()

    @mock.patch("mainframe.clients.events.fetch")
    def test_fetch_events_error(self, mock_fetch):
        mock_fetch.return_value = (None, Exception("Network error"))
        
        client = ZnClient(self.source)
        events = client.fetch_events()
        
        assert len(events) == 0