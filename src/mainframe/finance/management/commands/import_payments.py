from datetime import datetime
from decimal import Decimal
from functools import cached_property
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.db import IntegrityError
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.logs import get_default_logger
from mainframe.finance.models import Payment, Timetable
from mainframe.finance.tasks import backup_finance_model
from PyPDF2 import PdfReader

DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"


def normalize_amount(amount):
    return Decimal(amount.replace(".", "").replace(",", "."))


def parse_date(day, month, year):
    months = [
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
    ]
    return datetime(year=int(year), month=months.index(month) + 1, day=int(day)).date()


def parse_installment(rows):
    payment_type = "Rata credit"
    row = rows.pop(0).replace(f"{payment_type} ", "")
    day, month, year, total, remaining = row.split()
    principal = validate_starts_with(rows.pop(0), payment_type, "Principal", 1)
    interest = validate_starts_with(rows.pop(0), payment_type, "Dobanda", 2)
    additional_data = {
        "from": validate_starts_with(rows.pop(0), payment_type, "Din contul", 3)
    }
    return Payment(
        additional_data=additional_data,
        date=parse_date(day, month, year),
        interest=normalize_amount(interest),
        principal=normalize_amount(principal),
        remaining=normalize_amount(remaining),
        total=normalize_amount(total),
    )


def parse_interest(rows):
    payment_type = "Dobanda datorata"
    row = rows.pop(0).replace(f"{payment_type} ", "")
    day, month, year, total, remaining = row.split()
    account = validate_starts_with(rows.pop(0), payment_type, "Din contul", 1)
    interest = validate_starts_with(rows.pop(0), payment_type, "Dobanda", 2)
    details = validate_starts_with(rows.pop(0), payment_type, "Detalii", 3)
    reference = validate_starts_with(rows.pop(0), payment_type, "Referinta", 4)
    return Payment(
        additional_data={"details": details, "from": account},
        date=parse_date(day, month, year),
        interest=normalize_amount(interest),
        reference=reference,
        remaining=normalize_amount(remaining),
        total=normalize_amount(total),
    )


def validate_starts_with(row, payment_type, expected_field, line_no):
    if not row.startswith(f"{expected_field}: "):
        raise ValidationError(
            f"Expected <{payment_type}> line #{line_no} to be <{expected_field}...>."
            f" Found <{row}> instead"
        )
    return row.replace(f"{expected_field}: ", "")


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = get_default_logger(__name__, management=True)

        logger.info("Importing payments")
        now = datetime.now()

        total = 0
        data_path = settings.BASE_DIR / "finance" / "data" / "payments"
        for file_name in Path(data_path).glob("**/*.pdf"):
            reader = PdfReader(file_name)
            payments = self.extract_payments(reader.pages)
            try:
                results = Payment.objects.bulk_create(payments, ignore_conflicts=True)
            except ValidationError as e:
                logger.error(str(e))
                file_name.rename(
                    f"{data_path}/{file_name.stem}.{now}.validation_error.failed"
                )
                continue
            except IntegrityError as e:
                logger.error("%s\nFile: %s", e, file_name.stem)
                file_name.rename(
                    f"{data_path}/{file_name.stem}.{now}.integrity_error.failed"
                )
                continue
            else:
                logger.info("%s - done", file_name.stem)
                total += len(results)
                logger.info("Import completed - Deleting %s", file_name.stem)
                file_name.unlink()

        msg = f"Imported {total} payments"
        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS(msg))

        if total:
            backup_finance_model(model="Payment")

    def extract_payments(self, pages):
        payments = []
        for page in pages:
            header = "Balanta Debit Credit Detalii tranzactie Data"
            contents = page.extract_text().split(header)[1].strip().split("\n \n")[0]
            rows = [
                r for r in contents.split("\n")[:-1] if "Alocare fonduri" not in r and r
            ]
            payments.extend(self.parse_rows(rows))
        return payments

    def parse_prepayment(self, rows):
        payment_type = "Rambursare anticipata de principal"
        row = rows.pop(0).replace(f"{payment_type} ", "")
        day, month, year, total, remaining = row.split()
        date = parse_date(day, month, year)
        additional_data = {
            "from": validate_starts_with(rows.pop(0), payment_type, "Din contul", 1),
            "details": validate_starts_with(rows.pop(0), payment_type, "Detalii", 2),
        }
        reference = validate_starts_with(rows.pop(0), payment_type, "Referinta", 3)
        total = normalize_amount(total)
        return Payment(
            additional_data=additional_data,
            date=date,
            is_prepayment=True,
            principal=total,
            reference=reference,
            remaining=normalize_amount(remaining),
            saved=self.parse_saved(date, total),
            total=total,
        )

    def parse_rows(self, rows):
        payments = []
        while rows:
            if rows[0].startswith("Rata credit "):
                payments.append(parse_installment(rows))
            elif rows[0].startswith("Rambursare anticipata de principal "):
                payments.append(self.parse_prepayment(rows))
            elif rows[0].startswith("Dobanda datorata "):
                payments.append(parse_interest(rows))
            else:
                raise ValidationError(f"Unexpected row type: {rows[0]}")
        return payments

    def parse_saved(self, date, principal):
        timetable = None
        for t in self.timetables:  # timetables ordered by date descending
            if t.date < date:  # first timetable before this payment
                timetable = t
                break
        if not timetable:
            return 0

        amount, saved = Decimal(0), Decimal(0)
        for _, payment in enumerate(timetable.amortization_table):
            payment_principal = Decimal(payment["principal"])
            if amount + payment_principal > principal:
                break
            amount += payment_principal
            saved += Decimal(payment["interest"]) + Decimal(payment["insurance"])

        return saved

    @cached_property
    def timetables(self):
        return Timetable.objects.all()
