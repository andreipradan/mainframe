import csv
import io
from datetime import datetime

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from mainframe.finance.models import CryptoTransaction
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
