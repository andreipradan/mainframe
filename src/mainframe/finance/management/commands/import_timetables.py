from datetime import datetime
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.db import IntegrityError
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.logs import get_default_logger
from mainframe.finance.models import Account, Credit, Timetable
from mainframe.finance.tasks import backup_finance_model
from PyPDF2 import PdfReader


def extract_rows(rows):
    return [
        {
            "date": date,
            "total": total,
            "interest": interest,
            "principal": principal,
            "remaining": remaining,
            "insurance": insurance,
        }
        for date, total, interest, principal, remaining, insurance in (
            x.split() for x in rows
        )
    ]


def extract_amortization_table(pages):
    amortization_table = []
    for i, page in enumerate(pages):
        *rows, _, page = page.extract_text().split("\n")  # noqa: PLW2901
        rows = filter(lambda x: x[0].isdigit(), rows)
        current_page, _ = page.split("/")
        if i + 2 != int(current_page):
            raise AssertionError
        amortization_table.extend(extract_rows(rows))
    return amortization_table


def extract_summary(summary):
    (
        client_code,
        full_name,
        account_number,
        credit_number_and_date,
        credit_date,
        interest,
        margin_and_ircc,
        credit_total_and_currency,
        _,
        no_of_months,
    ) = filter(bool, summary.split("\n"))
    if not client_code.startswith("Cod Client"):
        raise AssertionError
    client_code = client_code.replace("Cod Client ", "")
    last_name_str, last_name, first_name_str, first_name = full_name.split()
    if (
        last_name_str != "Numele"
        or first_name_str != "Prenumele"
        or not account_number.startswith("Număr cont ")
    ):
        raise AssertionError
    account_number = account_number.replace("Număr cont ", "")
    if not credit_number_and_date.startswith("Număr şi data contract credit"):
        raise AssertionError
    credit_number = credit_number_and_date.replace(
        "Număr şi data contract credit", ""
    ).replace(" -", "")
    if not interest.startswith("Rata dobânzii ") or not interest.endswith(
        " compusă din:"
    ):
        raise AssertionError
    interest = (
        interest.replace("Rata dobânzii ", "")
        .replace(" compusă din:", "")
        .replace(",", ".")
    )
    if (
        not margin_and_ircc.startswith("Marjă: ")
        or " şi Indice  IRCC : " not in margin_and_ircc
    ):
        raise AssertionError
    margin, *_, ircc = margin_and_ircc.replace("Marjă: ", "").split()
    if not credit_total_and_currency.startswith("Valoare credit "):
        raise AssertionError
    credit_total, currency_str, currency = credit_total_and_currency.replace(
        "Valoare credit ", ""
    ).split()
    if currency_str != "Moneda":
        raise AssertionError
    credit_total = credit_total.replace(".", "").replace(",", ".")
    if not no_of_months.startswith("perioadă de") or not no_of_months.endswith(" luni"):
        raise AssertionError
    no_of_months = no_of_months.replace("perioadă de", "").replace(" luni", "")
    if Decimal(interest) != Decimal(margin) + Decimal(ircc):
        raise AssertionError
    return {
        "account__client_code": client_code,
        "account__first_name": first_name,
        "account__last_name": last_name,
        "account__number": account_number,
        "credit__currency": currency,
        "credit__date": credit_date,
        "credit__number": credit_number,
        "credit__total": credit_total,
        "margin": margin,
        "ircc": ircc,
        "credit_total": credit_total,
        "no_of_months": no_of_months,
    }


def extract_first_page(first_page, logger):
    summary, contents = first_page.extract_text().split("TABEL DE AMORTIZARE")
    fields, _, *rows, footer, __ = [x for x in contents.split("\n") if x]
    if fields != (
        "Data următoarei plăţi "
        "Suma de plată "
        "Dobânda "
        "Rata capital Capital datorat la sfârşitul perioadei"
        "Primă asigurare"
    ):
        raise AssertionError("Format has changed, please update extraction logic")
    if not footer.startswith(
        "Scadenţar al Rambursării Creditului şi Dobânzilor Data raport:"
    ):
        raise AssertionError
    date = footer.split("Data raport: ")[-1]
    summary = extract_summary(summary)
    account, created = Account.objects.get_or_create(
        client_code=summary["account__client_code"],
        first_name=summary["account__first_name"],
        last_name=summary["account__last_name"],
        number=summary["account__number"],
    )
    if created:
        logger.warning("New account: %s", account)
        backup_finance_model(model="Account")

    credit, created = Credit.objects.get_or_create(
        account_id=account.id,
        currency=summary["credit__currency"],
        date=datetime.strptime(summary["credit__date"], "%d.%m.%Y"),
        number=summary["credit__number"],
        total=summary["credit__total"],
    )

    if created:
        logger.warning("New credit: %s", account)
        backup_finance_model(model="Credit")

    return Timetable(
        credit_id=credit.id,
        date=datetime.strptime(date, "%d.%m.%Y"),
        ircc=summary["ircc"],
        margin=summary["margin"],
        amortization_table=extract_rows(rows),
    )


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = get_default_logger(__name__, management=True)

        logger.info("Importing timetable")
        now = datetime.now()

        total = 0
        data_path = settings.BASE_DIR / "finance" / "data" / "timetables"
        failed_imports = []
        for file_name in Path(data_path).glob("**/*.pdf"):
            reader = PdfReader(file_name)
            first_page = reader.pages[0]
            timetable: Timetable = extract_first_page(first_page, logger)
            timetable.amortization_table.extend(
                extract_amortization_table(reader.pages[1:])
            )
            try:
                timetable.save()
            except ValidationError as e:
                logger.error(str(e))
                file_name.rename(f"{data_path}/{file_name.stem}.{now}.failed")
                failed_imports.append(file_name.stem)
                continue
            except IntegrityError as e:
                logger.error("%s\nFile: %s", e, file_name.stem)
                file_name.rename(f"{data_path}/{file_name.stem}.{now}.failed")
                failed_imports.append(file_name.stem)
                continue
            else:
                logger.info("%s - done", file_name.stem)
                total += 1
                logger.info("Import completed - Deleting %s", file_name.stem)
                file_name.unlink()

        msg = f"Imported {total} timetables"
        if failed_imports:
            msg += f"\nFailed files: {', '.join(failed_imports)}"
            logger.error("Failed files: %s", ", ".join(failed_imports))

        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS(msg))
        if total:
            backup_finance_model(model="Timetable")
