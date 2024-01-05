import csv
import logging
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.db import IntegrityError

from clients.chat import send_telegram_message
from clients.logs import ManagementCommandsHandler
from finance.models.stocks import StockTransaction
from finance.tasks import backup_finance_model


def normalize_row(row: dict):
    def normalize_key(key):
        return key.lower().replace(" ", "_")

    def normalize_value(value):
        return str(value).replace("$", "").replace("€", "")

    row["Type"] = normalize_type(row["Type"])
    return {normalize_key(k): normalize_value(v) for (k, v) in row.items() if v}


def normalize_type(stock_type):
    types = dict(StockTransaction.TYPE_CHOICES).values()
    if stock_type not in types:
        return StockTransaction.TYPE_OTHER
    return list(types).index(stock_type) + 1


def parse_transactions(file_name, _):
    with open(file_name) as file:
        reader = csv.DictReader(file)
        return list(map(lambda row: StockTransaction(**normalize_row(row)), reader))


class Command(BaseCommand):
    def handle(self, *_, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        logger.info("Importing stock statements")
        now = datetime.now()

        total = 0
        data_path = settings.BASE_DIR / "finance" / "data" / "stock_transactions"

        for file_name in Path(data_path).glob(f"**/*.csv"):
            logger.info("Parsing %s", file_name.name)
            transactions = parse_transactions(file_name, logger)

            try:
                results = StockTransaction.objects.bulk_create(
                    transactions, ignore_conflicts=True
                )
            except (IntegrityError, ValidationError) as e:
                logger.error(str(e))
                file_name.rename(f"{file_name}.{e}.{now}.failed")
                continue
            else:
                results_count = len(results)
                logger.info("%s: %d rows", file_name.stem, results_count)
                total += results_count
                logger.info("Import completed - Deleting %s", file_name.stem)
                file_name.unlink()

        msg = f"Imported {total} stock transactions"
        send_telegram_message(text=msg)
        if total:
            backup_finance_model(model="StockTransaction")
