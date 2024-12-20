import io
import re
from datetime import datetime

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from mainframe.finance.models import Account, Credit, Timetable
from mainframe.finance.tasks import backup_finance_model
from PyPDF2 import PdfReader


class TimetableImportError(Exception):
    ...


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
        interest=summary["interest"],
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
    expected = [
        r"Cod Client (\d+)",
        r"Numele ([^>]+) Prenumele ([^>]+)",
        r"Număr cont (\d+)",
        r"Număr şi data contract credit(\d+) -",
        r"(\d{2}\.\d{2}\.\d{4})Rata dobânzii fixă in",
        r"primii 5 ani:(\d+\,\d+)",
        r"Rata dobânzii  variabilă folosită",
        r"începând cu al 6\xadlea an al duratei",
        r"creditului(\d+\.\d+) compusă din:",
        r"Marjă: \+(\d+\.\d+)\s+şi\s+Indice\s+IRCC\s*:\s*(\d+\.\d+)",
        r"Valoare credit (\d+\.\d+\,\d+) Moneda ([^>]{3})",
        r"Scadenţarul este generat pentru o",
        r"perioadă de(\d+) luni",
    ]
    extracted_values = []

    for line, pattern in zip(summary.split("\n"), expected, strict=False):
        match = re.match(pattern, line)
        if not match:
            raise ValueError(f"Line does not match expected format: {pattern}")
        extracted_values.extend(match.groups())

    return {
        "account__client_code": extracted_values[0],
        "account__last_name": extracted_values[1],
        "account__first_name": extracted_values[2],
        "account__number": extracted_values[3],
        "credit__currency": extracted_values[11],
        "credit__date": extracted_values[5],
        "credit__number": extracted_values[4],
        "credit__total": extracted_values[10].replace(".", "").replace(",", "."),
        "margin": extracted_values[8],
        "interest": extracted_values[6].replace(",", "."),
        "ircc": extracted_values[9],
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

    backup_finance_model(model="Timetable")
    return timetable
