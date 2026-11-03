from unittest import mock

import pytest

from mainframe.exchange.management.clients import BNR, FetchExchangeRatesException


def test_bnr_rejects_archive_page_without_links():
    client = BNR(mock.MagicMock())
    with (
        mock.patch.object(client, "do_request", return_value=b"<html></html>"),
        pytest.raises(
            FetchExchangeRatesException, match="archive links were not found"
        ),
    ):
        client.fetch_available_urls()
