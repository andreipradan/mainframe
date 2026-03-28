from unittest import mock

import pytest
from bs4 import BeautifulSoup

from mainframe.clients.events import ZnClient
from tests.factories.source import SourceFactory


@pytest.mark.django_db
class TestZnClient:
    def setup_method(self):
        self.source = SourceFactory.create(
            name="zn",
            url="https://www.example.com",
            config={
                "url": {"path": "test-path/"},
                "soup": {"string": "test search", "children": ".kzn-sw-item"},
                "city_name": "City Alpha",
                "city_slug": "city-alpha",
            },
        )

    def test_parse_data_with_real_html_structure(self):
        html = """
        <section>
            <div class="kzn-sw-item">
                <div><span>test search</span>
                    <div class="kzn-sw-item-textsus">Concert</div>
                    <h3><a href="/event/concert-rock-2026">Concert Rock</a></h3>
                    <div class="kzn-sw-item-sumar">description</div>
                    <div class="kzn-one-event-date">
                        <div>Date 15/06</div>
                        <div>20:00</div>
                    </div>
                    <div class="kzn-sw-item-adresa">hall name</div>
                </div>
            </div>
            <div class="kzn-sw-item">
                <div>
                    <div class="kzn-sw-item-textsus">Festival</div>
                    <h3><a href="/event/festival-vara-2026">Summer Festival</a></h3>
                    <div class="kzn-sw-item-sumar">desc</div>
                    <div class="kzn-one-event-date">
                        <div>Date 20/07</div>
                        <div>18:30</div>
                    </div>
                    <div class="kzn-sw-item-adresa">test location</div>
                </div>
            </div>
        </section>
        """
        soup = BeautifulSoup(html, "html.parser")

        client = ZnClient(self.source)
        events = client.parse_data(soup)

        assert len(events) == 2

        # Check first event
        event1 = events[0]
        assert event1.title == "Concert Rock"
        assert event1.description == "description"
        assert event1.location == "hall name"
        assert event1.city_name == "City Alpha"
        assert event1.city_slug == "city-alpha"
        assert event1.category_id == 4  # Concert category defaults to "other" (4)
        assert event1.url == "/event/concert-rock-2026"
        assert event1.external_id == "2026"

        # Check second event
        event2 = events[1]
        assert event2.title == "Summer Festival"
        assert event2.description == "desc"
        assert event2.location == "test location"
        assert event2.category_id == 4  # Default category for Festival

    def test_parse_data_no_matching_section(self):
        html = """
        <section>All events City Alpha | 2026
        </section>
        <div>No events here</div>
        """
        soup = BeautifulSoup(html, "html.parser")

        client = ZnClient(self.source)
        events = client.parse_data(soup)

        assert len(events) == 0

    def test_parse_data_missing_location(self):
        html = """
        <section>test search City Alpha | 2026
            <div class="kzn-sw-item">
                <div><span>test search</span>
                    <div class="kzn-sw-item-textsus">Expo</div>
                    <h3><a href="/event/expozitie-art-2026">Art Expo</a></h3>
                    <div class="kzn-sw-item-sumar">Expo picture</div>
                    <div class="kzn-one-event-date">
                        <div>Date 10/08</div>
                        <div>10:00</div>
                    </div>
                    <div class="kzn-sw-item-adresa"></div>
                </div>
            </div>
        </section>
        """
        soup = BeautifulSoup(html, "html.parser")

        client = ZnClient(self.source)
        events = client.parse_data(soup)

        assert len(events) == 1
        event = events[0]
        assert event.title == "Art Expo"
        assert event.location == ""  # Empty location element

    @mock.patch("mainframe.clients.events.fetch")
    def test_fetch_events_success(self, mock_fetch):
        # Mock the HTML response with the section containing the target string
        html = """
        <html>
            <body>
                <section>test search City Alpha | 2026
                    <div class="kzn-sw-item">
                        <div><span>test search</span>
                            <div class="kzn-sw-item-textsus">Concert</div>
                            <h3><a href="/event/test-event-2026">Test Event</a></h3>
                            <div class="kzn-sw-item-sumar">Test description</div>
                            <div class="kzn-one-event-date">
                                <div>Date 01/01</div>
                                <div>12:00</div>
                            </div>
                            <div class="kzn-sw-item-adresa">Test Location</div>
                        </div>
                    </div>
                </section>
            </body>
        </html>
        """
        soup = BeautifulSoup(html, "html.parser")
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
