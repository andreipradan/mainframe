import csv
import logging
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.db import IntegrityError

from api.bots.webhooks.shared import chunks
from clients import cron
from clients.chat import send_telegram_message
from clients.cron import remove_crons_for_command
from clients.logs import ManagementCommandsHandler
from crons.models import Cron
from finance.models import Account, Transaction


def get_field(header):
    if header.lower() in ["started date", "completed date"]:
        return f"{header.split(' ')[0].lower()}_at"
    return header.lower()


def normalize(transaction):
    transaction["balance"] = transaction["balance"] or None

    for time_field in ["started_at", "completed_at"]:
        transaction[time_field] = (
            datetime.strptime(transaction[time_field], "%Y-%m-%d %H:%M:%S").replace(
                tzinfo=timezone.utc
            )
            if transaction[time_field]
            else None
        )
    return transaction


def detect_started_at(description, default):
    started_at_title = "Data utilizarii cardului "
    if started_at_title in (started_at := description.split("|")[-1]):
        started_at = started_at.replace(started_at_title, "").strip()
    else:
        started_at = default

    return datetime.strptime(started_at, "%d/%m/%Y").replace(tzinfo=timezone.utc)


def detect_transaction_type(description, is_credit=False):
    last_part = description.split("|")[-1].lower()
    if "atm" in [item.lower() for item in description.split()]:
        return Transaction.TYPE_ATM
    for key in (
        "PLATA LUNA ",
        "revolut  " "revolutie Dublin ",
        "www.revolutieinternal Dublin",
        "Revolut ",
        "Revolut*",
        "REVOLUT**",
        "|REVOLUT |",
        "| SENT FROM REVOLUT",
    ):
        if key in description:
            return Transaction.TYPE_TOPUP if is_credit else Transaction.TYPE_TRANSFER
    for key in ("depozit", "transfer", "trz ib conturi proprii"):
        if key in last_part:
            return Transaction.TYPE_TRANSFER
    if "schimb valutar" in description.lower():
        return Transaction.TYPE_EXCHANGE
    for key in ("telemunca", "salar", "plata automata dob", "diurna"):
        if key in last_part:
            return Transaction.TYPE_TOPUP
    if "refund" in description.lower():
        return Transaction.TYPE_CARD_REFUND
    return Transaction.TYPE_UNIDENTIFIED if is_credit else Transaction.TYPE_CARD_PAYMENT


def parse_additional_data(data):
    fields = (
        "nr_op",
        "tax_code",
        "final_ordinator",
        "final_beneficiary",
        "ord_ben_name",
        "ord_ben_bank",
        "acc_number",
    )
    additional_data = {}
    for i, value in enumerate(data):
        if value := value.strip():
            additional_data[fields[i]] = value
    return additional_data


def parse_raiffeisen_transactions(file_name, logger):
    from openpyxl import load_workbook

    wb = load_workbook(file_name)
    ws = wb.active

    rows = list(ws.rows)
    starting_index = None
    for i, row in enumerate(rows):
        if row[0].value == "Nume client:":
            starting_index = i

    if not starting_index:
        raise ValidationError("Could not find starting index")

    assert rows[starting_index][0].value == "Nume client:"
    middle_name, first_name, last_name = [
        n.capitalize() for n in rows[starting_index][1].value.split()
    ]
    assert rows[starting_index + 2][0].value == "Numar client:"
    client_code = rows[starting_index + 2][1].value
    assert rows[starting_index + 4][0].value == "Unitate Bancara:"
    bank = rows[starting_index + 4][1].value
    assert rows[starting_index + 6][0].value == "Cod IBAN:"
    number = " ".join(chunks(rows[starting_index + 6][1].value, 4))
    assert rows[starting_index + 6][2].value == "Tip cont:"
    account_type = "Current" if rows[starting_index + 6][3].value == "curent" else None
    assert rows[starting_index + 6][4].value == "Valuta:"
    currency = (
        "RON"
        if rows[starting_index + 6][5].value == "LEI"
        else rows[starting_index + 6][5].upper()
    )

    account, created = Account.objects.get_or_create(
        bank=bank,
        client_code=client_code,
        currency=currency,
        first_name=f"{middle_name} {first_name}",
        last_name=last_name,
        number=number,
        type=account_type,
    )
    if created:
        logger.warning(f"New account: {account}")

    header_index = starting_index + 11
    header = [x.value for x in rows[header_index]]
    assert header == [
        "Data inregistrare",
        "Data tranzactiei",
        "Suma debit",
        "Suma credit",
        "Nr. OP",
        "Cod fiscal beneficiar",
        "Ordonator final",
        "Beneficiar final",
        "Nume/Denumire \n ordonator/beneficiar",
        "Denumire Banca \nordonator/ beneficiar",
        "Nr. cont in/din care se \n efectueaza tranzactiile",
        "Descrierea tranzactiei",
    ]

    assert not any([x.value for x in rows[header_index + 1]])
    rows = rows[header_index + 2 :]
    transactions = []
    while any((row := [x.value for x in rows.pop(0)])):
        started_at, completed_at, debit, credit, *additional_data, description = row
        completed_at = completed_at and datetime.strptime(
            completed_at, "%d/%m/%Y"
        ).replace(tzinfo=timezone.utc)
        transactions.append(
            Transaction(
                account=account,
                additional_data=parse_additional_data(additional_data),
                amount=credit if credit else -debit,
                completed_at=completed_at,
                currency=currency,
                description=description,
                product=account_type,
                started_at=detect_started_at(description, default=started_at),
                state=completed_at and "Completed",
                type=detect_transaction_type(description, is_credit=bool(credit)),
            )
        )
    return transactions


def parse_revolut_transactions(file_name, _):
    current_account = Account.objects.get(
        bank__icontains="revolut",
        type=Account.TYPE_CURRENT,
    )
    savings_account = Account.objects.get(
        bank__icontains="revolut", type=Account.TYPE_SAVINGS
    )

    with open(file_name) as file:
        reader = csv.DictReader(file)
        reader.fieldnames = list(map(get_field, reader.fieldnames))
        return list(
            map(
                lambda transaction_dict: Transaction(
                    account=(
                        current_account
                        if transaction_dict["product"] == Account.TYPE_CURRENT
                        else savings_account
                    ),
                    **normalize(transaction_dict),
                ),
                reader,
            )
        )


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--bank", type=str, required=True)

    def handle(self, *args, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        bank = options["bank"]
        if bank == "raiffeisen":
            extension = "xlsx"
            parser = parse_raiffeisen_transactions
        elif bank == "revolut":
            extension = "csv"
            parser = parse_revolut_transactions
        else:
            raise NotImplementedError(f"Missing bank parser for: {bank}")

        logger.info(f"Importing{f' {bank}' if bank else ''} statements")
        now = datetime.now()

        total = 0
        data_path = settings.BASE_DIR / "finance" / "data" / "statements"
        failed_imports = []

        for file_name in Path(data_path).glob(f"**/*.{extension}"):
            logger.info(f"Parsing {file_name.name}")
            transactions = parser(file_name, logger)

            try:
                results = Transaction.objects.bulk_create(transactions)
            except ValidationError as e:
                logger.error(str(e))
                file_name.rename(f"{file_name}.{now}.failed")
                failed_imports.append(str(file_name))
                continue
            except IntegrityError as e:
                logger.error(f"{e}\nFile: {file_name}")
                file_name.rename(f"{file_name}.{now}.failed")
                failed_imports.append(str(file_name))
                continue
            else:
                results_count = len(results)
                logger.info(f"{file_name.stem}: {results_count} rows")
                total += results_count
                logger.info(f"Import completed - Deleting {file_name.stem}")
                file_name.unlink()

        msg = f"Imported {total} {bank} transactions"
        if failed_imports:
            msg += f"\nFailed files: {', '.join(failed_imports)}"
            logger.error(msg)

        remove_crons_for_command(Cron(command="import_statements", is_management=True))

        send_telegram_message(text=msg)

        self.stdout.write(self.style.SUCCESS(msg))
        cron.delay("backup_finance --model=Account")
        cron.delay("backup_finance --model=Transaction")
