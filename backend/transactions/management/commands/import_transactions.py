import csv
import logging
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError

from transactions.models import Transaction

logger = logging.getLogger(__name__)

DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"


def get_field(header):
    if header.lower() in ["started date", "completed date"]:
        return f"{header.split(' ')[0].lower()}_at"
    return header.lower()


def normalize(transaction):
    if transaction["balance"] == "":
        transaction["balance"] = None

    for time_field in ["started_at", "completed_at"]:
        transaction[time_field] = datetime.strptime(
            transaction[time_field], DATETIME_FORMAT
        ).replace(tzinfo=timezone.utc)
    return transaction


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger.info("Importing transactions")

        total = 0
        for file_name in Path(settings.BASE_DIR / "transactions" / "data").glob(
            "**/*.csv"
        ):
            with open(file_name) as file:
                reader = csv.DictReader(file)
                reader.fieldnames = list(map(get_field, reader.fieldnames))
                transactions = map(
                    lambda transaction_dict: Transaction(**normalize(transaction_dict)),
                    reader,
                )
                try:
                    results = Transaction.objects.bulk_create(transactions)
                except ValidationError as e:
                    logger.error(f"{e}\nFile: {file_name.stem}")
                except IntegrityError as e:
                    logger.error(f"{e}\nFile: {file_name.stem}")
                else:
                    results_count = len(results)
                    logger.info(f"{file_name.stem}: {results_count} rows")
                    total += results_count

        self.stdout.write(self.style.SUCCESS(f"Imported {total} transactions"))
