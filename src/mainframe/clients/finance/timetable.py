import io
from datetime import datetime
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from mainframe.finance.models import Account, Credit, Timetable
from mainframe.finance.tasks import backup_finance_model
from PyPDF2 import PdfReader


class TimetableImportError(Exception): ...


def extract_amortization_table(pages):
    amortization_table = []
    for i, page in enumerate(pages):
        *rows, _, page = page.extract_text().split("\n")  # noqa: PLW2901
        rows = filter(lambda x: x[0].isdigit(), rows)
        current_page, _ = page.split("/")
        if i + 2 != int(current_page):
            raise TimetableImportError("Invalid current page format")
        amortization_table.extend(extract_rows(rows))
    return amortization_table


def extract_first_page(first_page, logger):
    try:
        summary, contents = first_page.extract_text().split("TABEL DE AMORTIZARE")
    except ValueError as e:
        raise TimetableImportError("Could not extract details on first page") from e
    fields, _, *rows, footer, __ = [x for x in contents.split("\n") if x]
    if fields != (
        "Data următoarei plăţi "
        "Suma de plată "
        "Dobânda "
        "Rata capital Capital datorat la sfârşitul perioadei"
        "Primă asigurare"
    ):
        raise TimetableImportError("Format has changed, please update extraction logic")
    if not footer.startswith(
        "Scadenţar al Rambursării Creditului şi Dobânzilor Data raport:"
    ):
        raise TimetableImportError("Invalid footer format")
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
        date=datetime.strptime(summary["credit__date"], "%d.%m.%Y").date(),
        number=summary["credit__number"],
        total=summary["credit__total"],
    )

    if created:
        logger.warning("New credit: %s", account)
        backup_finance_model(model="Credit")

    return Timetable(
        credit_id=credit.id,
        date=datetime.strptime(date, "%d.%m.%Y").date(),
        ircc=summary["ircc"],
        margin=summary["margin"],
        amortization_table=extract_rows(rows),
    )


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
        raise TimetableImportError("Invalid client code format")
    client_code = client_code.replace("Cod Client ", "")
    last_name_str, last_name, first_name_str, first_name = full_name.split()
    if (
        last_name_str != "Numele"
        or first_name_str != "Prenumele"
        or not account_number.startswith("Număr cont ")
    ):
        raise TimetableImportError("Invalid full name format")
    account_number = account_number.replace("Număr cont ", "")
    if not credit_number_and_date.startswith("Număr şi data contract credit"):
        raise TimetableImportError("Invalid account number and contract date format")
    credit_number = credit_number_and_date.replace(
        "Număr şi data contract credit", ""
    ).replace(" -", "")
    if not interest.startswith("Rata dobânzii ") or not interest.endswith(
        " compusă din:"
    ):
        raise TimetableImportError("Invalid interest rate format")
    interest = (
        interest.replace("Rata dobânzii ", "")
        .replace(" compusă din:", "")
        .replace(",", ".")
    )
    if (
        not margin_and_ircc.startswith("Marjă: ")
        or " şi Indice  IRCC : " not in margin_and_ircc
    ):
        raise TimetableImportError("Invalid interest margin format")
    margin, *_, ircc = margin_and_ircc.replace("Marjă: ", "").split()
    if not credit_total_and_currency.startswith("Valoare credit "):
        raise TimetableImportError("Invalid credit amount format")
    credit_total, currency_str, currency = credit_total_and_currency.replace(
        "Valoare credit ", ""
    ).split()
    if currency_str != "Moneda":
        raise TimetableImportError("Invalid currency format")
    credit_total = credit_total.replace(".", "").replace(",", ".")
    if not no_of_months.startswith("perioadă de") or not no_of_months.endswith(" luni"):
        raise TimetableImportError("Invalid period format")
    no_of_months = no_of_months.replace("perioadă de", "").replace(" luni", "")
    if Decimal(interest) != Decimal(margin) + Decimal(ircc):
        raise TimetableImportError(
            "Invalid total interest (not equal to margin + ircc)"
        )
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


def import_timetable(file, logger):
    if isinstance(file, str):
        reader = PdfReader(file)
    else:
        reader = PdfReader(io.BytesIO(file.read()))
    first_page = reader.pages[0]
    timetable = extract_first_page(first_page, logger)
    timetable.amortization_table.extend(extract_amortization_table(reader.pages[1:]))
    try:
        timetable.save()
    except (IntegrityError, ValidationError, ValueError) as e:
        logger.error(str(e))
        raise TimetableImportError from e
    else:
        backup_finance_model(model="Timetable")
        return timetable
