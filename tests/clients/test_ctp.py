import asyncio
from datetime import datetime
from types import SimpleNamespace
from unittest import mock

import aiohttp
import pytest
from bs4 import BeautifulSoup

from mainframe.clients.ctp import (
    CTPClient,
    FetchTransitLinesException,
    extract_line_type,
    extract_terminals,
    handle_wrong_date_row,
)
from mainframe.transit_lines.models import Schedule, TransitLine


class TestExtractLineType:
    @pytest.mark.parametrize(
        ("classes", "expected"),
        [
            (["element", "trams"], TransitLine.CAR_TYPE_TRAM),
            (["element", "trolleybus"], TransitLine.CAR_TYPE_TROLLEYBUS),
            (["element", "trolleybuses"], TransitLine.CAR_TYPE_TROLLEYBUS),
            (["element", "minibuses"], TransitLine.CAR_TYPE_MINIBUS),
            (["element"], TransitLine.CAR_TYPE_BUS),
        ],
    )
    def test_selects_car_type_from_source_classes(self, classes, expected):
        assert extract_line_type(classes) == expected


class TestExtractTerminals:
    @pytest.mark.parametrize(
        ("route", "expected", "separators"),
        [
            ("TerminalA-TerminalB", ("TerminalA", "TerminalB"), ["-"]),
            (
                "TerminalA-TerminalB-TerminalC",
                ["TerminalA", "TerminalB"],
                ["-"],
            ),
            ("Cluj-Napoca-Floresti", ("Cluj-Napoca", "Floresti"), []),
        ],
    )
    def test_extracts_route_endpoints(self, route, expected, separators):
        assert extract_terminals(route, separators) == expected

    def test_raises_for_route_without_recognized_terminals(self):
        with pytest.raises(
            FetchTransitLinesException, match="Couldn't extract terminals"
        ):
            extract_terminals("Unparseable route", [" - ", "-", "–"])


class TestFetchLines:
    def test_parses_line_details_without_writing_to_database(self):
        html = """
        <div class="element trams" data-title="Line">
          <h6 itemprop="name">Line Cora 1🚲 Line</h6>
          <div class="ruta">Terminal A - Terminal B</div>
        </div>
        <div class="element" data-title="Other">
          <h6 itemprop="name">Not a line</h6>
        </div>
        """
        client = CTPClient(mock.MagicMock())

        with (
            mock.patch(
                "mainframe.clients.ctp.scraper.fetch",
                return_value=(BeautifulSoup(html, "html.parser"), None),
            ) as fetch,
            mock.patch(
                "mainframe.clients.ctp.TransitLine.objects.bulk_create"
            ) as bulk_create,
        ):
            lines = client.fetch_lines(TransitLine.LINE_TYPE_URBAN, commit=False)

        fetch.assert_called_once_with(
            "https://ctpcj.ro/index.php/en/timetables/urban-lines"
        )
        bulk_create.assert_not_called()
        assert len(lines) == 1
        assert lines[0].name == "1"
        assert lines[0].car_type == TransitLine.CAR_TYPE_TRAM
        assert lines[0].has_bike_rack is True
        assert (lines[0].terminal1, lines[0].terminal2) == (
            "Terminal A",
            "Terminal B",
        )

    def test_rejects_invalid_line_type_before_fetching(self):
        client = CTPClient(mock.MagicMock())
        with pytest.raises(FetchTransitLinesException, match="Invalid line_type"):
            client.fetch_lines("invalid", commit=False)

    @pytest.mark.parametrize(
        ("soup", "error"),
        [
            (None, RuntimeError("request failed")),
            (SimpleNamespace(text="EROARE"), None),
        ],
    )
    def test_raises_when_source_request_fails(self, soup, error):
        client = CTPClient(mock.MagicMock())
        with (
            mock.patch(
                "mainframe.clients.ctp.scraper.fetch", return_value=(soup, error)
            ),
            pytest.raises(FetchTransitLinesException),
        ):
            client.fetch_lines(TransitLine.LINE_TYPE_URBAN)


class TestParseSchedule:
    def setup_method(self):
        self.client = CTPClient(mock.MagicMock())
        self.line = TransitLine(name="1", line_type=TransitLine.LINE_TYPE_URBAN)

    def test_parses_start_date_and_ignores_blank_schedule_cells(self):
        response = "\n".join(
            [
                "Schedule",
                "Line 1",
                "Date,16,06,2026",
                "Terminal 1,Terminal 2",
                "Time,Time",
                "06:00,06:15",
                ",07:15",
                "08:00,",
                ",",
            ]
        )

        schedule = self.client.parse_schedule((response, self.line, "lv", "url"))

        assert schedule.line is self.line
        assert schedule.occurrence == "lv"
        assert schedule.schedule_start_date == datetime(2026, 6, 16)
        assert schedule.terminal1_schedule == ["06:00", "08:00"]
        assert schedule.terminal2_schedule == ["06:15", "07:15"]

    @pytest.mark.parametrize("response", ["", "<title> 404 Not Found</title>"])
    def test_returns_none_for_missing_schedule(self, response):
        assert self.client.parse_schedule((response, self.line, "d", "url")) is None

    @pytest.mark.parametrize(
        ("date_row", "expected"),
        [
            ("20.02.20232", datetime(2023, 2, 20)),
            ("17.05.2024.2024", datetime(2024, 5, 17)),
            ("30.09.06.2024", datetime(2024, 9, 30)),
            ("24.02.2024v", datetime(2024, 2, 24)),
        ],
    )
    def test_accepts_known_malformed_source_dates(self, date_row, expected):
        assert handle_wrong_date_row(date_row, self.client.logger) == expected

    def test_logs_and_returns_none_for_unknown_source_date(self):
        logger = mock.MagicMock()

        assert handle_wrong_date_row("not-a-date", logger) is None

        logger.exception.assert_called_once_with(
            "Unexpected date format", row="not-a-date"
        )


@pytest.mark.asyncio
class TestRequest:
    def setup_method(self):
        self.client = CTPClient(mock.MagicMock())
        self.line = TransitLine(name="1", line_type=TransitLine.LINE_TYPE_URBAN)
        self.url = "https://ctpcj.ro/orare/csv/orar_1_lv.csv"

    async def test_returns_response_with_line_and_occurrence(self):
        response = mock.MagicMock(status=200)
        response.text = mock.AsyncMock(return_value="csv data")
        request_context = mock.MagicMock()
        request_context.__aenter__ = mock.AsyncMock(return_value=response)
        request_context.__aexit__ = mock.AsyncMock(return_value=None)
        session = mock.MagicMock()
        session.get.return_value = request_context

        result = await self.client.request(
            session, asyncio.Semaphore(1), (self.line, "lv", self.url)
        )

        assert result == ("csv data", self.line, "lv", self.url)
        session.get.assert_called_once_with(
            self.url, headers={"Referer": "https://ctpcj.ro/"}
        )

    async def test_returns_empty_csv_on_connection_failure(self):
        connection_key = mock.MagicMock(host="ctpcj.ro", port=443, ssl=True)
        error = aiohttp.ClientConnectorError(
            connection_key, OSError("connection failed")
        )
        request_context = mock.MagicMock()
        request_context.__aenter__ = mock.AsyncMock(side_effect=error)
        session = mock.MagicMock()
        session.get.return_value = request_context

        result = await self.client.request(
            session, asyncio.Semaphore(1), (self.line, "lv", self.url)
        )

        assert result == ("", self.line, "lv", self.url)
        self.client.logger.exception.assert_called_once()

    async def test_raises_on_unexpected_http_status(self):
        response = mock.MagicMock(status=503)
        request_context = mock.MagicMock()
        request_context.__aenter__ = mock.AsyncMock(return_value=response)
        request_context.__aexit__ = mock.AsyncMock(return_value=None)
        session = mock.MagicMock()
        session.get.return_value = request_context

        with pytest.raises(ValueError, match="Unexpected status.*503"):
            await self.client.request(
                session, asyncio.Semaphore(1), (self.line, "lv", self.url)
            )


@pytest.mark.asyncio
async def test_fetch_schedules_builds_weekday_urls_and_skips_empty_results():
    client = CTPClient(mock.MagicMock())
    line = TransitLine(name="12a", line_type=TransitLine.LINE_TYPE_URBAN)
    schedule = Schedule(line=line, occurrence="lv")

    async def line_iterator():
        yield line

    async def get_lines():
        return line_iterator()

    lines = get_lines()
    request_many = mock.AsyncMock(return_value=iter([schedule, None, None]))

    with mock.patch.object(client, "request_many", request_many):
        result = await client.fetch_schedules(lines=lines, commit=False)

    assert result == [schedule]
    request_many.assert_awaited_once_with(
        [
            (line, "lv", client.DETAIL_URL.format("12A", "lv")),
            (line, "s", client.DETAIL_URL.format("12A", "s")),
            (line, "d", client.DETAIL_URL.format("12A", "d")),
        ]
    )
