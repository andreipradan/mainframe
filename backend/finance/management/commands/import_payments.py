import logging
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.db import IntegrityError
from PyPDF2 import PdfReader

from api.bots.webhooks.shared import chunks
from clients.cron import remove_crons_for_command
from clients.chat import send_telegram_message
from clients.logs import ManagementCommandsHandler
from crons.models import Cron
from finance.models import Payment


DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"


def normalize_month(month):
    return [
        "ianuarie",
        "februarie",
        "martie",
        "aprilie",
        "mai",
        "iunie",
        "iulie",
        "august",
        "septembrie",
        "octombrie",
        "noiembrie",
        "decembrie",
    ].index(month) + 1


def normalize_amount(amount):
    return Decimal(amount.replace(".", "").replace(",", "."))


def extract_payment(row):
    payment = {}
    for item in row:
        if item.startswith("Rata credit "):
            item = item.replace("Rata credit ", "")
            day, month, year, total, remaining = item.split()
            payment["total"] = normalize_amount(total)
            payment["remaining"] = normalize_amount(remaining)
            payment["date"] = datetime(
                year=int(year),
                month=normalize_month(month),
                day=int(day),
            ).date()
        if item.startswith("Principal: "):
            item = item.replace("Principal: ", "")
            payment["principal"] = normalize_amount(item)
        if item.startswith("Dobanda: "):
            item = item.replace("Dobanda: ", "")
            payment["interest"] = normalize_amount(item)
        if item.startswith("Rambursare anticipata de principal "):
            item = item.replace("Rambursare anticipata de principal ", "")
            day, month, year, total, remaining = item.split()
            payment["date"] = datetime(
                year=int(year),
                month=normalize_month(month),
                day=int(day),
            ).date()
            payment["is_prepayment"] = True
            payment["remaining"] = normalize_amount(remaining)
            total = normalize_amount(total)
            payment["principal"] = total
            payment["total"] = total
        if item.startswith("Referinta: "):
            item = item.replace("Referinta: ", "")
            payment["reference"] = item
    return Payment(**payment)


def extract_payments(pages):
    payments = []
    for page in pages:
        header = "Balanta Debit Credit Detalii tranzactie Data"
        contents = [
            item
            for item in (
                page.extract_text()
                .split(header)[1]
                .strip()
                .split("\n \n")[0]
                .replace("Roxana Petria", "")
            ).split("\n")
            if "Alocare fonduri" not in item and item
        ]
        payments.extend([extract_payment(payment) for payment in chunks(contents, 4)])
    return payments


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        logger.info("Importing payments")
        now = datetime.now()

        total = 0
        data_path = settings.BASE_DIR / "finance" / "data" / "payments"
        failed_imports = []
        for file_name in Path(data_path).glob("**/*.pdf"):
            reader = PdfReader(file_name)
            payments = extract_payments(reader.pages)
            try:
                results = Payment.objects.bulk_create(payments, ignore_conflicts=True)
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
                logger.info(f"{file_name.stem} - done")
                total += len(results)
                logger.info(f"Import completed - Deleting {file_name.stem}")
                file_name.unlink()

        msg = f"Imported {total} payments"
        if failed_imports:
            msg += f"\nFailed files: {', '.join(failed_imports)}"
            logger.error(msg)

        remove_crons_for_command(Cron(command="import_payments", is_management=True))
        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS(msg))
