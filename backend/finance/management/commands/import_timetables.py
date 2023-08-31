import logging
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.db import IntegrityError
from PyPDF2 import PdfReader

from clients import cron
from clients.chat import send_telegram_message
from clients.cron import remove_crons_for_command
from clients.logs import ManagementCommandsHandler
from crons.models import Cron
from finance.models import Account, Credit, Timetable


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
        for date, total, interest, principal, remaining, insurance in map(
            lambda x: x.split(), rows
        )
    ]


def extract_amortization_table(pages):
    amortization_table = []
    for i, page in enumerate(pages):
        *rows, _, page = page.extract_text().split("\n")
        rows = filter(lambda x: x[0].isdigit(), rows)
        current_page, _ = page.split("/")
        assert i + 2 == int(current_page)
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
    assert client_code.startswith("Cod Client")
    client_code = client_code.replace("Cod Client ", "")
    last_name_str, last_name, first_name_str, first_name = full_name.split()
    assert last_name_str == "Numele"
    assert first_name_str == "Prenumele"
    assert account_number.startswith("Număr cont ")
    account_number = account_number.replace("Număr cont ", "")
    assert credit_number_and_date.startswith("Număr şi data contract credit")
    credit_number = credit_number_and_date.replace(
        "Număr şi data contract credit", ""
    ).replace(" -", "")
    assert interest.startswith("Rata dobânzii ")
    assert interest.endswith(" compusă din:")
    interest = (
        interest.replace("Rata dobânzii ", "")
        .replace(" compusă din:", "")
        .replace(",", ".")
    )
    assert margin_and_ircc.startswith("Marjă: ")
    assert " şi Indice  IRCC : " in margin_and_ircc
    margin, *_, ircc = margin_and_ircc.replace("Marjă: ", "").split()
    assert credit_total_and_currency.startswith("Valoare credit ")
    credit_total, currency_str, currency = credit_total_and_currency.replace(
        "Valoare credit ", ""
    ).split()
    assert currency_str == "Moneda"
    credit_total = credit_total.replace(".", "").replace(",", ".")
    assert no_of_months.startswith("perioadă de")
    assert no_of_months.endswith(" luni")
    no_of_months = no_of_months.replace("perioadă de", "").replace(" luni", "")
    assert Decimal(interest) == Decimal(margin) + Decimal(ircc)
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
    fields, _, *rows, footer, page = [x for x in contents.split("\n") if x]
    assert fields == (
        "Data următoarei plăţi "
        "Suma de plată "
        "Dobânda "
        "Rata capital Capital datorat la sfârşitul perioadei"
        "Primă asigurare"
    ), "Format has changed, please update extraction logic"
    assert footer.startswith(
        "Scadenţar al Rambursării Creditului şi Dobânzilor Data raport:"
    )
    date = footer.split("Data raport: ")[-1]
    summary = extract_summary(summary)
    account, created = Account.objects.get_or_create(
        client_code=summary["account__client_code"],
        first_name=summary["account__first_name"],
        last_name=summary["account__last_name"],
        number=summary["account__number"],
    )
    if created:
        logger.warning(f"New account: {account}")

    credit, created = Credit.objects.get_or_create(
        account_id=account.id,
        currency=summary["credit__currency"],
        date=datetime.strptime(summary["credit__date"], "%d.%m.%Y"),
        number=summary["credit__number"],
        total=summary["credit__total"],
    )

    if created:
        logger.warning(f"New credit: {account}")

    return Timetable(
        credit_id=credit.id,
        date=datetime.strptime(date, "%d.%m.%Y"),
        ircc=summary["ircc"],
        margin=summary["margin"],
        amortization_table=extract_rows(rows),
    )


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

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
                logger.error(f"{e}\nFile: {file_name.stem}")
                file_name.rename(f"{data_path}/{file_name.stem}.{now}.failed")
                failed_imports.append(file_name.stem)
                continue
            else:
                logger.info(f"{file_name.stem} - done")
                total += 1
                logger.info(f"Import completed - Deleting {file_name.stem}")
                file_name.unlink()

        msg = f"Imported {total} timetables"
        if failed_imports:
            msg += f"\nFailed files: {', '.join(failed_imports)}"
            logger.error(msg)

        remove_crons_for_command(Cron(command="import_timetable", is_management=True))

        send_telegram_message(text=msg)

        self.stdout.write(self.style.SUCCESS(msg))
        cron.delay("backup_finance --model=Account")
        cron.delay("backup_finance --model=Credit", minutes=3)
        cron.delay("backup_finance --model=Timetable", minutes=5)
