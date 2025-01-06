import csv
import io
from datetime import datetime

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from mainframe.finance.models import CryptoPnL, CryptoTransaction
from mainframe.finance.tasks import backup_finance_model


class CryptoImportError(Exception):
    ...


def normalize_price(price):
    if not price:
        return None, None
    if price.startswith("$"):
        return price.replace("$", "").replace(",", "").strip(), "USD"
    if price.startswith("€"):
        return price.replace("€", "").replace(",", "").strip(), "EUR"

    price, currency = price.split()
    return price.replace(",", "").strip(), currency.replace(",", "").strip()


def normalize_type(transaction_type):
    types = dict(CryptoTransaction.TYPE_CHOICES).values()
    if transaction_type not in types:
        raise CryptoImportError(
            f"Unexpected crypto transaction type: {transaction_type}"
        )
    return list(types).index(transaction_type) + 1


class CryptoPnLImporter:
    header = [
        "Date acquired",
        "Date sold",
        "Symbol",
        "Quantity",
        "Cost basis",
        "Gross proceeds",
        "Gross PnL",
        "Fees",
        "Net PnL",
        "Currency",
    ]

    def __init__(self, file, logger):
        self.file = io.TextIOWrapper(file)
        self.logger = logger

    def parse_pnl(self):
        def normalize_key(key):
            key = key.lower().replace(" ", "_")
            if key == "gross_proceeds":
                return "amount"
            if key == "symbol":
                return "ticker"
            return key

        reader = csv.reader(self.file)
        if (header := next(reader)) != self.header:
            raise CryptoImportError(f"Unexpected sells header: {header}")

        pnl = [dict(zip(self.header, line, strict=False)) for line in reader]
        return [
            CryptoPnL(**{normalize_key(k): v for (k, v) in row.items()}) for row in pnl
        ]

    def run(self):
        try:
            results = CryptoPnL.objects.bulk_create(
                self.parse_pnl(),
                update_conflicts=True,
                update_fields=[
                    "amount",
                    "cost_basis",
                    "fees",
                    "gross_pnl",
                    "net_pnl",
                ],
                unique_fields=[
                    "currency",
                    "date_acquired",
                    "date_sold",
                    "ticker",
                    "quantity",
                ],
            )
        except (IntegrityError, ValidationError) as e:
            self.logger.error(str(e))
            raise CryptoImportError(e) from e
        else:
            self.logger.info("Imported '%d' stock pnl records", len(results))

        backup_finance_model(model="CryptoPnL")


class CryptoTransactionsImporter:
    def __init__(self, file, logger):
        self.file = io.TextIOWrapper(file)
        self.logger = logger

    def normalize_row(self, row: dict):
        def normalize_key(key):
            return key.lower().replace(" ", "_")

        def normalize_value(value):
            return str(value).replace("$", "").replace("€", "")

        price, currency = normalize_price(row["Price"])
        fees, fees_currency = normalize_price(row["Fees"])
        value, value_currency = normalize_price(row["Value"])

        if currency != fees_currency != value_currency:
            raise CryptoImportError(
                f"Got different currencies for price and fees: {row}"
            )
        row["Currency"] = currency
        row["Fees"] = fees
        row["Price"] = price
        row["Value"] = value
        row["Quantity"] = row["Quantity"].replace(",", "").strip()

        row["Type"] = normalize_type(row["Type"])
        row["Date"] = datetime.strptime(row["Date"], "%b %d, %Y, %I:%M:%S %p")
        return {normalize_key(k): normalize_value(v) for (k, v) in row.items() if v}

    def parse_transactions(self):
        reader = csv.DictReader(self.file)
        return [CryptoTransaction(**self.normalize_row(row)) for row in reader]

    def run(self):
        try:
            transactions = self.parse_transactions()
            results = CryptoTransaction.objects.bulk_create(
                transactions,
                update_conflicts=True,
                update_fields=["currency", "fees", "price", "value"],
                unique_fields=["date", "quantity", "symbol", "type"],
            )
        except (IntegrityError, ValidationError) as e:
            self.logger.error(str(e))
        else:
            self.logger.info("Imported '%d' crypto transactions", len(results))

        backup_finance_model(model="CryptoTransaction")
