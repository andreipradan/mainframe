from datetime import datetime
from unittest import mock

import pytest
from bs4 import BeautifulSoup

from mainframe.events.tasks import (
    FetchBandError,
    clean_date,
    clean_url,
    extract_api_concerts,
    extract_embedded_concerts,
    extract_html_concerts,
    get_band_concerts,
    validate_selectors,
)
from tests.factories.source import SourceFactory


class TestCleanDate:
    config = {
        "date_format": "%B %d, %Y",
        "date_format_alternative": "%b %d, %Y",
    }

    def test_parses_range_without_year_using_current_year(self):
        date = clean_date("OCT 30-31-01", self.config)

        assert (date.year, date.month, date.day) == (datetime.now().year, 10, 30)

    def test_parses_range_with_year(self):
        date = clean_date("FEB 04-10, 2027", self.config)

        assert (date.year, date.month, date.day) == (2027, 2, 4)


class TestEventTaskHelpers:
    def test_clean_url_keeps_affiliate_key_and_drops_other_query_data(self):
        assert (
            clean_url(
                "https://tickets.example/event?afflky=partner&utm_source=test#details"
            )
            == "https://tickets.example/event?afflky=partner"
        )

    def test_validate_selectors_requires_selector_mapping(self):
        band = SourceFactory.build(name="Test Artist")

        with pytest.raises(FetchBandError, match="Selectors not set"):
            validate_selectors(band, {})

    def test_validate_selectors_requires_all_mandatory_fields(self):
        band = SourceFactory.build(name="Test Artist")

        with pytest.raises(FetchBandError, match="Mandatory selectors"):
            validate_selectors(band, {"list": ".event"})

    def test_extracts_html_events_and_cleans_ticket_url(self):
        band = SourceFactory.build(
            name="Test Artist",
            config={
                "date_format": "%Y-%m-%d",
                "selectors": {
                    "list": ".event",
                    "location": ".location",
                    "start_date": ".date",
                    "url": "a.ticket",
                },
            },
            url="https://tickets.example/",
        )
        response = BeautifulSoup(
            """
            <div class="event">
              <span class="location">Hall A</span>
              <span class="date">2026-11-20</span>
              <a class="ticket" href="https://tickets.example/event?afflky=partner&amp;utm_source=test#top"></a>
            </div>
            """,
            "html.parser",
        )

        events = extract_html_concerts(band, response)

        assert len(events) == 1
        assert events[0].title == "Test Artist @ Hall A"
        assert events[0].url == "https://tickets.example/event?afflky=partner"
        assert events[0].description == ""
        assert events[0].end_date is None

    @mock.patch("mainframe.events.tasks.store_concerts")
    @mock.patch("mainframe.events.tasks.fetch")
    def test_get_band_concerts_uses_html_parser(self, fetch, store_concerts):
        band = SourceFactory.build(
            name="Test Artist",
            config={
                "parser": "html",
                "date_format": "%Y-%m-%d",
                "selectors": {
                    "list": ".event",
                    "location": ".location",
                    "start_date": ".date",
                    "url": "a.ticket",
                },
            },
            url="https://tickets.example/",
        )
        response = BeautifulSoup(
            """
            <div class="event">
              <span class="location">Hall A</span>
              <span class="date">2026-11-20</span>
              <a class="ticket" href="https://tickets.example/event"></a>
            </div>
            """,
            "html.parser",
        )
        fetch.return_value = (response, None)

        get_band_concerts.call_local(band)

        fetch.assert_called_once_with(band.url)
        store_concerts.assert_called_once()
        assert store_concerts.call_args.args[0] == band.name
        assert len(store_concerts.call_args.args[1]) == 1


class TestExtractEmbeddedConcerts:
    def setup_method(self):
        self.band = SourceFactory.build(
            name="Test Artist",
            config={
                "date_format": "%d %b",
                "date_format_alternative": "%d %B",
                "missing_year": True,
                "parser": "embedded",
            },
        )

    def test_extracts_events_from_inline_script_data(self):
        response = BeautifulSoup(
            """
            <script id="tracking-data">
                window.trackingData = {
                    blockData: [
                        {
                            "type": "ExternalLinks",
                            "items": [{"url": "https://tickets.example/incorrect"}]
                        }
                    ]
                };
            </script>
            <script id="event-smart-data">
                window.smartData = {
                    blocks: [
                        {
                            "type": "ExternalLinks",
                            "isEnabled": true,
                            "content": [
                                {
                                    "id": "event-1",
                                    "title": "12 Nov | Sample City, Venue Alpha",
                                    "url": "https://tickets.example/event-1"
                                },
                                {
                                    "id": "event-2",
                                    "title": "15 Jan | Example City, Venue Beta",
                                    "url": "https://tickets.example/event-2?afflky=partner"
                                },
                                {
                                    "id": "event-3",
                                    "title": "26 Nov | Demo, Hall C *SOLD OUT*",
                                    "url": "https://tickets.example/event-3"
                                }
                            ]
                        },
                        {
                            "type": "ExternalLinks",
                            "isEnabled": false,
                            "content": [
                                {
                                    "id": "event-4",
                                    "title": "20 Nov | Mock City, Venue Delta",
                                    "url": "https://tickets.example/event-4"
                                }
                            ]
                        }
                    ]
                };
            </script>
            """,
            "html.parser",
        )

        concerts = extract_embedded_concerts(self.band, response)

        assert len(concerts) == 3
        assert concerts[0].title == "Test Artist @ Venue Alpha"
        assert concerts[0].city == "Sample City"
        assert concerts[0].location == "Venue Alpha"
        assert concerts[0].start_date.month == 11
        assert concerts[0].start_date.year == datetime.now().year + (
            datetime.now().month > 11
        )
        assert concerts[0].external_id == "event-1"
        assert concerts[1].city == "Example City"
        assert concerts[1].location == "Venue Beta"
        assert concerts[1].start_date.year == datetime.now().year + (
            datetime.now().month > 1
        )
        assert concerts[1].url == "https://tickets.example/event-2?afflky=partner"
        assert concerts[2].additional_data == {"sold_out": True}
        assert concerts[2].description == ""
        assert concerts[2].location == "Hall C"

    def test_raises_when_event_data_is_missing(self):
        response = BeautifulSoup("<html></html>", "html.parser")

        with pytest.raises(FetchBandError, match="Embedded event data not found"):
            extract_embedded_concerts(self.band, response)


class TestExtractApiConcerts:
    def setup_method(self):
        self.band = SourceFactory.build(
            name="Test Artist",
            headers={"Authorization": "test-token"},
            config={"parser": "api"},
        )

    def test_extracts_api_event_data(self):
        response = mock.Mock()
        response.json.return_value = {
            "data": [
                {
                    "id": "event-1",
                    "attributes": {
                        "starts-at-date-local": "2027-02-13",
                        "ends-at-date-local": "2027-02-13",
                        "venue-display-name": "The Venue",
                        "venue-city": "Sample City",
                        "venue-country": "United States",
                        "venue-time-zone": "America/Los_Angeles",
                        "primary-link-url": "https://tickets.example/event-1",
                        "primary-button-text": "Tickets",
                        "additional-info": "The Example Tour",
                        "venue-formatted-address": "Sample City, CA",
                        "venue-address-line1": "123 Example Street",
                        "venue-country-code": "US",
                        "venue-latitude": 34.0,
                        "venue-longitude": -118.0,
                        "is-sold-out": True,
                    },
                }
            ]
        }

        concerts = extract_api_concerts(self.band, response)

        assert len(concerts) == 1
        assert concerts[0].title == "Test Artist @ The Venue"
        assert concerts[0].location == "The Venue"
        assert concerts[0].city == "Sample City, US"
        assert concerts[0].start_date.isoformat() == "2027-02-13T00:00:00-08:00"
        assert concerts[0].end_date == concerts[0].start_date
        assert concerts[0].url == "https://tickets.example/event-1"
        assert concerts[0].external_id == "event-1"
        assert concerts[0].description == "The Example Tour"
        assert concerts[0].additional_data == {
            "sold_out": True,
            "api": response.json.return_value["data"][0],
        }

    def test_rejects_invalid_event_date(self):
        response = mock.Mock()
        response.json.return_value = {
            "data": [
                {
                    "id": "event-1",
                    "attributes": {
                        "starts-at-date-local": "not-a-date",
                        "venue-display-name": "The Venue",
                        "primary-link-url": "https://tickets.example/event-1",
                    },
                }
            ]
        }

        with pytest.raises(FetchBandError, match="Invalid API event date"):
            extract_api_concerts(self.band, response)

    @mock.patch("mainframe.events.tasks.store_concerts")
    @mock.patch("mainframe.events.tasks.fetch")
    def test_fetches_api_with_source_headers(self, mock_fetch, mock_store):
        response = mock.Mock()
        response.json.return_value = {"data": []}
        mock_fetch.return_value = (response, None)

        get_band_concerts.call_local(self.band)

        mock_fetch.assert_called_once_with(
            self.band.url,
            soup=False,
            headers={
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
                "Authorization": "test-token",
            },
        )
        mock_store.assert_not_called()
