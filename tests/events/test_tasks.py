from datetime import datetime

import pytest
from bs4 import BeautifulSoup

from mainframe.events.tasks import FetchBandError, clean_date, extract_embedded_concerts
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
