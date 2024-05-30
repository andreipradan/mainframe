import csv
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.db import IntegrityError
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.logs import get_default_logger
from mainframe.finance.models.stocks import PnL
from mainframe.finance.tasks import backup_finance_model


def parse_pnl(file_name):
    def normalize_key(key):
        key = key.lower().replace(" ", "_")
        if key == "symbol":
            return "ticker"
        if key == "realised_pnl":
            return "pnl"
        return key

    with open(file_name) as file:
        reader = csv.DictReader(file)
        return [
            PnL(**{normalize_key(k): v for (k, v) in row.items()}) for row in reader
        ]


class Command(BaseCommand):
    def handle(self, *_, **options):
        logger = get_default_logger(__name__, management=True)

        logger.info("Importing stock PnL")
        now = datetime.now()

        total = 0
        data_path = settings.BASE_DIR / "finance" / "data" / "stock_pnl"

        for file_name in Path(data_path).glob("**/*.csv"):
            logger.info("Parsing %s", file_name.name)
            try:
                results = PnL.objects.bulk_create(
                    parse_pnl(file_name), ignore_conflicts=True
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

        msg = f"Imported {total} stock PnL"
        send_telegram_message(text=msg)
        if total:
            backup_finance_model(model="PnL")
