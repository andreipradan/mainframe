import csv
import logging
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.db import IntegrityError

from clients.cron import remove_crons_for_command
from clients.chat import send_telegram_message
from clients.logs import get_handler
from crons.models import Cron
from transactions.models import Transaction


DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"


def get_field(header):
    if header.lower() in ["started date", "completed date"]:
        return f"{header.split(' ')[0].lower()}_at"
    return header.lower()


def normalize(transaction):
    if transaction["balance"] == "":
        transaction["balance"] = None

    for time_field in ["started_at", "completed_at"]:
        transaction[time_field] = (
            datetime.strptime(transaction[time_field], DATETIME_FORMAT).replace(
                tzinfo=timezone.utc
            )
            if transaction[time_field]
            else None
        )
    return transaction


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(get_handler(Path(__file__).stem))

        logger.info("Importing transactions")
        now = datetime.now()

        total = 0
        data_path = settings.BASE_DIR / "transactions" / "data"
        failed_imports = []
        for file_name in Path(data_path).glob("**/*.csv"):
            with open(file_name) as file:
                reader = csv.DictReader(file)
                reader.fieldnames = list(map(get_field, reader.fieldnames))
                transactions = map(
                    lambda transaction_dict: Transaction(**normalize(transaction_dict)),
                    reader,
                )
                try:
                    results = Transaction.objects.bulk_create(
                        transactions,
                        update_conflicts=True,
                        update_fields=(
                            "balance",
                            "completed_at",
                            "fee",
                            "product",
                            "state",
                        ),
                        unique_fields=(
                            "amount",
                            "currency",
                            "description",
                            "type",
                            "started_at",
                            "balance",
                        ),
                    )
                except ValidationError as e:
                    logger.error(str(e))
                    file_name.rename(f"{data_path}/{file_name.stem}.{now}.failed")
                    failed_imports.append(file_name.stem)
                    continue
                except IntegrityError as e:
                    logger.error(f"{e}\nFile: {file_name.stem}")
                    file_name.rename(f"{data_path}/{file_name.stem}.{now}.failed")
                    failed_imports.append(file_name.stem)
                    continue
                else:
                    results_count = len(results)
                    logger.info(f"{file_name.stem}: {results_count} rows")
                    total += results_count
                    logger.info(f"Import completed - Deleting {file_name.stem}")
                    file_name.unlink()

        msg = f"Imported {total} transactions"
        if failed_imports:
            msg += f"\nFailed files: {', '.join(failed_imports)}"
            logger.error(msg)

        remove_crons_for_command(
            Cron(command="import_transactions", is_management=True)
        )

        send_telegram_message(text=msg)

        self.stdout.write(self.style.SUCCESS(msg))
