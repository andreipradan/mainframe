import csv
import io
from datetime import datetime, timezone

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.db import IntegrityError
from mainframe.bots.webhooks.shared import chunks
from mainframe.finance.models import Account, Transaction
from mainframe.finance.tasks import backup_finance_model


class StatementImportError(Exception): ...


class StatementParser:
    def __init__(self, file: InMemoryUploadedFile, logger):
        self.file = file
        self.logger = logger

    def run(self):
        raise NotImplementedError


class RaiffeisenParser(StatementParser):
    @staticmethod
    def detect_started_at(description, default):
        started_at_title = "Data utilizarii cardului "
        if started_at_title in (started_at := description.split("|")[-1]):
            started_at = started_at.replace(started_at_title, "").strip()
        else:
            started_at = default

        return datetime.strptime(started_at, "%d/%m/%Y").replace(tzinfo=timezone.utc)

    @staticmethod
    def detect_transaction_type(description, is_credit=False):  # noqa: C901, PLR0911
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
                return (
                    Transaction.TYPE_TOPUP if is_credit else Transaction.TYPE_TRANSFER
                )
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
        for key in ("comision", "dobanda", "taxa"):
            if key in description.lower():
                return Transaction.TYPE_FEE
        return (
            Transaction.TYPE_UNIDENTIFIED
            if is_credit
            else Transaction.TYPE_CARD_PAYMENT
        )

    @staticmethod
    def extract_additional_data(data):
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

    def run(self):  # noqa: C901, PLR0912
        from openpyxl import load_workbook

        wb = load_workbook(self.file)
        ws = wb.active

        rows = list(ws.rows)
        starting_index = None
        for i, row in enumerate(rows):
            if row[0].value == "Nume client:":
                starting_index = i

        if not starting_index:
            raise StatementImportError("Could not find starting index")

        if rows[starting_index][0].value != "Nume client:":
            raise AssertionError
        middle_name, first_name, last_name = [
            n.capitalize() for n in rows[starting_index][1].value.split()
        ]
        if rows[starting_index + 2][0].value != "Numar client:":
            raise AssertionError
        client_code = rows[starting_index + 2][1].value
        if rows[starting_index + 4][0].value != "Unitate Bancara:":
            raise AssertionError
        bank = rows[starting_index + 4][1].value
        if rows[starting_index + 6][0].value != "Cod IBAN:":
            raise AssertionError
        number = " ".join(chunks(rows[starting_index + 6][1].value, 4))
        if rows[starting_index + 6][2].value != "Tip cont:":
            raise AssertionError
        account_type = (
            "Current" if rows[starting_index + 6][3].value == "curent" else None
        )
        if rows[starting_index + 6][4].value != "Valuta:":
            raise AssertionError
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
            self.logger.warning("New account: %s", account)
            backup_finance_model(model="Account")

        header_index = starting_index + 11
        header = [x.value for x in rows[header_index]]
        if header != [
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
        ]:
            raise AssertionError

        if any(x.value for x in rows[header_index + 1]):
            raise AssertionError
        rows = rows[header_index + 2 :]
        transactions = []
        while any((row := [x.value for x in rows.pop(0)])):
            started_at, completed_at, debit, credit, *additional_data, description = row
            completed_at = completed_at and datetime.strptime(
                completed_at, "%d/%m/%Y"
            ).replace(tzinfo=timezone.utc)

            cleaned_description, from_description = description, []
            if "|" in description:
                cleaned_description, *from_description = description.split("|")
                cleaned_description = cleaned_description.strip()
                from_description = [part.strip() for part in from_description]

            additional_data = self.extract_additional_data(additional_data)
            additional_data["from_description"] = from_description
            transactions.append(
                Transaction(
                    account=account,
                    additional_data=additional_data,
                    amount=credit if credit else -debit,
                    completed_at=completed_at,
                    currency=currency,
                    description=cleaned_description,
                    product=account_type,
                    started_at=self.detect_started_at(description, default=started_at),
                    state=completed_at and "Completed",
                    type=self.detect_transaction_type(
                        description, is_credit=bool(credit)
                    ),
                )
            )
        return transactions


class RevolutParser(StatementParser):
    @staticmethod
    def get_field(header):
        if header.lower() in ["started date", "completed date"]:
            return f"{header.split(' ')[0].lower()}_at"
        return header.lower()

    @staticmethod
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

    def run(self):
        current_account, savings_account = Account.objects.filter(
            bank__icontains="revolut",
            type__in=[Account.TYPE_CURRENT, Account.TYPE_SAVINGS],
        )

        reader = csv.DictReader(io.StringIO(self.file.read().decode("utf-8")))
        reader.fieldnames = list(map(self.get_field, reader.fieldnames))
        return [
            Transaction(
                account=(
                    current_account
                    if transaction_dict["product"] == Account.TYPE_CURRENT
                    else savings_account
                ),
                **self.normalize(transaction_dict),
            )
            for transaction_dict in reader
        ]


def import_statement(file: str | InMemoryUploadedFile, logger):
    extension = (
        file.split(".")[-1] if isinstance(file, str) else file.name.split(".")[-1]
    ).lower()
    if extension == "xlsx":
        parser = RaiffeisenParser(file, logger)
    elif extension == "csv":
        parser = RevolutParser(file, logger)
    else:
        raise NotImplementedError(
            f'Missing bank statement parser for extension: "{extension}"'
        )

    try:
        results = parser.run()
    except (IndexError, ValueError) as e:
        logger.error(e)
        raise StatementImportError(e) from e

    try:
        transactions = Transaction.objects.bulk_create(results)
    except (IntegrityError, ValidationError) as e:
        logger.error(e)
        raise StatementImportError(e) from e

    backup_finance_model(model="Transaction")
    return transactions
