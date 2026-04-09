from unittest import mock

import pytest
import requests

from mainframe.clients import scraper


class FakeResponse:
    def __init__(self, content):
        self.content = content

    def raise_for_status(self):
        return None


@pytest.mark.django_db
class TestFetch:
    @mock.patch("mainframe.clients.scraper.requests.request")
    def test_fetch_returns_soup_on_success(self, mock_request):
        mock_request.return_value = FakeResponse(b"<html><body></body></html>")
        res, err = scraper.fetch("http://x", soup=True)
        assert err is None
        assert hasattr(res, "select")

    @mock.patch("mainframe.clients.scraper.requests.request")
    def test_fetch_returns_error_on_connection(self, mock_request):
        mock_request.side_effect = requests.exceptions.ConnectionError("conn")
        res, err = scraper.fetch("http://x", retries=0)
        assert res is None
        assert isinstance(err, Exception)

    @mock.patch("mainframe.clients.scraper.requests.request")
    def test_fetch_return_response_when_soup_false(self, mock_request):
        mock_request.return_value = FakeResponse(b"ok")
        res, err = scraper.fetch("http://x", soup=False)
        assert err is None
        assert hasattr(res, "content")
