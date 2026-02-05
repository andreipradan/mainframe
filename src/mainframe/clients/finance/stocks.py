import csv
import io

from django.core.exceptions import ValidationError
from django.db import IntegrityError

from mainframe.finance.models import PnL, StockTransaction
from mainframe.finance.tasks import backup_finance_model


class StockImportError(Exception): ...


class StockPnLImporter:
    header = [
        "Date acquired",
        "Date sold",
        "Symbol",
        "Security name",
        "ISIN",
        "Country",
        "Quantity",
        "Cost basis",
        "Gross proceeds",
        "Gross PnL",
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
            if key == "gross_pnl":
                return "pnl"
            return key

        reader = csv.reader(self.file)
        if (header := next(reader)) != ["Income from Sells"]:
            raise StockImportError(f"Unexpected top header: {header}")
        if (header := next(reader)) != self.header:
            raise StockImportError(f"Unexpected sells header: {header}")

        pnl = []
        while line := next(reader):
            pnl.append(dict(zip(self.header, line, strict=False)))

        return [PnL(**{normalize_key(k): v for (k, v) in row.items()}) for row in pnl]

    def run(self):
        try:
            results = PnL.objects.bulk_create(
                self.parse_pnl(),
                ignore_conflicts=True,
            )
        except (IntegrityError, ValidationError) as e:
            self.logger.error(str(e))
            raise StockImportError(e) from e

        self.logger.info("Imported '%d' pnl records", len(results))
        backup_finance_model(model="PnL")


class StockTransactionsImporter:
    def __init__(self, file, logger):
        self.file = io.TextIOWrapper(file)
        self.logger = logger

    def normalize_row(self, row: dict):
        def normalize_key(key):
            return key.lower().replace(" ", "_")

        def normalize_value(value):
            return str(value).replace("$", "").replace("€", "").replace(",", "")

        row["Type"] = self.normalize_type(row["Type"])
        return {normalize_key(k): normalize_value(v) for (k, v) in row.items() if v}

    def normalize_type(self, stock_type):
        types = dict(StockTransaction.TYPE_CHOICES).values()
        if stock_type not in types:
            return StockTransaction.TYPE_OTHER
        return list(types).index(stock_type) + 1

    def parse_transactions(self):
        reader = csv.DictReader(self.file)
        return [StockTransaction(**self.normalize_row(row)) for row in reader]

    def run(self):
        try:
            transactions = self.parse_transactions()
            results = StockTransaction.objects.bulk_create(
                transactions,
                update_conflicts=True,
                update_fields=["price_per_share", "quantity", "ticker"],
                unique_fields=["date", "currency", "fx_rate", "total_amount", "type"],
            )
        except (IntegrityError, ValidationError) as e:
            self.logger.error(str(e))
        else:
            self.logger.info("Imported '%d' stock transactions", len(results))

        backup_finance_model(model="StockTransaction")
