import csv
import logging
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.db import IntegrityError

from bots.models import Bot
from clients.cron import remove_crons_for_command
from core.settings import get_file_handler
from transactions.models import Transaction

logger = logging.getLogger(__name__)
logger.addHandler(get_file_handler(Path(__file__).stem))

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
                    results = Transaction.objects.bulk_create(transactions)
                except ValidationError as e:
                    logger.error(f"{e}\nFile: {file_name.stem}")
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

        remove_crons_for_command("import_transactions")

        msg = f"Imported {total} transactions"
        if failed_imports:
            msg += f"\nFailed files: {', '.join(failed_imports)}"
        bot = Bot.objects.get(additional_data__debug_chat_id__isnull=False)
        bot.send_message(chat_id=bot.additional_data["debug_chat_id"], text=msg)
        self.stdout.write(self.style.SUCCESS(msg))
