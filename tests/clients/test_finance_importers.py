from datetime import datetime
from io import BytesIO
from unittest import mock

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from mainframe.clients.finance.crypto import (
    CryptoImportError,
    CryptoPnLImporter,
    CryptoTransactionsImporter,
    normalize_price,
)
from mainframe.clients.finance.crypto import (
    normalize_type as normalize_crypto_type,
)
from mainframe.clients.finance.stocks import (
    StockImportError,
    StockPnLImporter,
    StockTransactionsImporter,
)
from mainframe.finance.models import CryptoPnL, CryptoTransaction, PnL, StockTransaction


@pytest.mark.parametrize(
    ("importer_class", "error_class"),
    [
        (CryptoPnLImporter, CryptoImportError),
        (StockPnLImporter, StockImportError),
    ],
)
def test_pnl_importers_reject_empty_files(importer_class, error_class):
    importer = importer_class(BytesIO(b""), mock.MagicMock())

    with pytest.raises(error_class):
        importer.parse_pnl()


def test_stock_importer_rejects_missing_column_header():
    importer = StockPnLImporter(BytesIO(b"Income from Sells\n"), mock.MagicMock())

    with pytest.raises(StockImportError, match="Unexpected sells header"):
        importer.parse_pnl()


def test_stock_importer_accepts_header_only_file():
    content = (
        "Income from Sells\n" + ",".join(StockPnLImporter.header) + "\n"
    ).encode()
    importer = StockPnLImporter(BytesIO(content), mock.MagicMock())

    assert importer.parse_pnl() == []


@pytest.mark.parametrize(
    ("price", "expected"),
    [
        (None, (None, None)),
        ("$1,234.50", ("1234.50", "USD")),
        ("€1,234.50", ("1234.50", "EUR")),
        ("1,234.50 USD", ("1234.50", "USD")),
    ],
)
def test_normalize_crypto_price(price, expected):
    assert normalize_price(price) == expected


def test_normalize_crypto_type():
    assert normalize_crypto_type("Buy") == CryptoTransaction.TYPE_BUY

    with pytest.raises(CryptoImportError, match="Unexpected crypto transaction type"):
        normalize_crypto_type("Unknown")


def test_crypto_pnl_importer_parses_rows_and_normalizes_fields():
    row = "2025-01-01,2025-01-02,BTC,1,100,150,50,1,49,USD"
    content = ",".join(CryptoPnLImporter.header) + "\n" + row + "\n"
    importer = CryptoPnLImporter(BytesIO(content.encode()), mock.MagicMock())

    results = importer.parse_pnl()

    assert len(results) == 1
    assert results[0].ticker == "BTC"
    assert results[0].amount == "150"
    assert results[0].gross_pnl == "50"


def test_crypto_pnl_importer_runs_and_backups():
    content = ",".join(CryptoPnLImporter.header) + "\n"
    importer = CryptoPnLImporter(BytesIO(content.encode()), mock.MagicMock())
    with (
        mock.patch.object(CryptoPnL.objects, "bulk_create", return_value=[]),
        mock.patch("mainframe.clients.finance.crypto.backup_finance_model") as backup,
    ):
        importer.run()

    backup.assert_called_once_with(model="CryptoPnL")


def test_crypto_pnl_importer_wraps_database_errors():
    content = ",".join(CryptoPnLImporter.header) + "\n"
    logger = mock.MagicMock()
    importer = CryptoPnLImporter(BytesIO(content.encode()), logger)
    with (
        mock.patch.object(CryptoPnL.objects, "bulk_create", side_effect=IntegrityError),
        mock.patch("mainframe.clients.finance.crypto.backup_finance_model") as backup,
        pytest.raises(CryptoImportError),
    ):
        importer.run()

    logger.exception.assert_called_once_with("Failed to create crypto PnL records")
    backup.assert_not_called()


def test_crypto_transaction_importer_normalizes_rows():
    row = {
        "Date": "Jan 01, 2025, 01:02:03 PM",
        "Symbol": "BTC",
        "Type": "Buy",
        "Quantity": "1,000",
        "Price": "$1,234.50",
        "Fees": "$1.00",
        "Value": "$1,235.50",
    }

    result = CryptoTransactionsImporter.normalize_row(row)

    assert result["currency"] == "USD"
    assert result["quantity"] == "1000"
    assert result["type"] == str(CryptoTransaction.TYPE_BUY)
    assert result["date"] == str(datetime(2025, 1, 1, 13, 2, 3))


def test_crypto_transaction_importer_rejects_mixed_currencies():
    row = {
        "Date": "Jan 01, 2025, 01:02:03 PM",
        "Symbol": "BTC",
        "Type": "Buy",
        "Quantity": "1",
        "Price": "$1.00",
        "Fees": "€1.00",
        "Value": "1.00 GBP",
    }

    with pytest.raises(CryptoImportError, match="different currencies"):
        CryptoTransactionsImporter.normalize_row(row)


def test_crypto_transaction_importer_parses_csv():
    content = (
        "Date,Symbol,Type,Quantity,Price,Fees,Value\n"
        '"Jan 01, 2025, 01:02:03 PM",BTC,Buy,1,$1.00,$0.10,$1.10\n'
    )
    importer = CryptoTransactionsImporter(BytesIO(content.encode()), mock.MagicMock())

    results = importer.parse_transactions()

    assert len(results) == 1
    assert results[0].symbol == "BTC"


def test_crypto_transaction_importer_runs_after_database_error():
    importer = CryptoTransactionsImporter(
        BytesIO(b"Date,Symbol,Type,Quantity,Price,Fees,Value\n"), mock.MagicMock()
    )
    with (
        mock.patch.object(
            CryptoTransaction.objects,
            "bulk_create",
            side_effect=ValidationError("invalid transaction"),
        ),
        mock.patch("mainframe.clients.finance.crypto.backup_finance_model") as backup,
    ):
        importer.run()

    backup.assert_called_once_with(model="CryptoTransaction")


def test_stock_pnl_importer_parses_rows_and_normalizes_fields():
    row = "2025-01-01,2025-01-02,ABC,Company,US123,US,1,100,150,50,USD"
    content = (
        "Income from Sells\n" + ",".join(StockPnLImporter.header) + "\n" + row + "\n"
    )
    importer = StockPnLImporter(BytesIO(content.encode()), mock.MagicMock())

    results = importer.parse_pnl()

    assert len(results) == 1
    assert results[0].ticker == "ABC"
    assert results[0].amount == "150"
    assert results[0].pnl == "50"


def test_stock_pnl_importer_rejects_unexpected_top_header():
    importer = StockPnLImporter(BytesIO(b"Wrong header\n"), mock.MagicMock())

    with pytest.raises(StockImportError, match="Unexpected top header"):
        importer.parse_pnl()


def test_stock_pnl_importer_runs_and_backups():
    content = "Income from Sells\n" + ",".join(StockPnLImporter.header) + "\n"
    importer = StockPnLImporter(BytesIO(content.encode()), mock.MagicMock())
    with (
        mock.patch.object(PnL.objects, "bulk_create", return_value=[]),
        mock.patch("mainframe.clients.finance.stocks.backup_finance_model") as backup,
    ):
        importer.run()

    backup.assert_called_once_with(model="PnL")


def test_stock_pnl_importer_wraps_database_errors():
    content = "Income from Sells\n" + ",".join(StockPnLImporter.header) + "\n"
    logger = mock.MagicMock()
    importer = StockPnLImporter(BytesIO(content.encode()), logger)
    with (
        mock.patch.object(PnL.objects, "bulk_create", side_effect=IntegrityError),
        pytest.raises(StockImportError),
    ):
        importer.run()

    logger.exception.assert_called_once_with("Error importing pnl records")


def test_stock_transaction_importer_normalizes_rows_and_types():
    importer = StockTransactionsImporter(BytesIO(b""), mock.MagicMock())

    result = importer.normalize_row(
        {
            "Type": "BUY - MARKET",
            "Date": "2025-01-01 12:00:00",
            "Currency": "USD",
            "FX Rate": "1.0000",
            "Price per share": "$10.50",
            "Quantity": "1,000",
            "Ticker": "ABC",
            "Total amount": "$1,234.50",
            "Optional": "",
        }
    )

    assert result["type"] == str(StockTransaction.TYPE_BUY_MARKET)
    assert result["price_per_share"] == "10.50"
    assert result["total_amount"] == "1234.50"
    assert "optional" not in result
    assert (
        StockTransactionsImporter.normalize_type("Unknown")
        == StockTransaction.TYPE_OTHER
    )


def test_stock_transaction_importer_parses_and_runs():
    content = (
        "Type,Date,Currency,FX Rate,Price per share,Quantity,Ticker,Total amount\n"
        "BUY - MARKET,2025-01-01 12:00:00,USD,1.0000,$10.50,1,ABC,$10.50\n"
    )
    importer = StockTransactionsImporter(BytesIO(content.encode()), mock.MagicMock())
    with (
        mock.patch.object(StockTransaction.objects, "bulk_create", return_value=[]),
        mock.patch("mainframe.clients.finance.stocks.backup_finance_model") as backup,
    ):
        results = importer.parse_transactions()
        assert len(results) == 1
        assert results[0].ticker == "ABC"
        importer.run()

    backup.assert_called_once_with(model="StockTransaction")
