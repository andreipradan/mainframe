import io
import unicodedata
from types import SimpleNamespace
from unittest import mock

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from mainframe.clients.finance import timetable

HEADER = unicodedata.normalize(
    "NFD",
    "Data următoarei plăți Suma de plată Dobândă Rata capital "
    "Capital datorat la sfârșitul perioadei Primă asigurare",
)
FOOTER = "Scadenţar al Rambursării Creditului şi Dobânzilor Data raport: 22.11.2026"
SUMMARY_DATA = {
    "account__client_code": "123456",
    "account__first_name": "Jane",
    "account__last_name": "Doe",
    "account__number": "789",
    "credit__currency": "RON",
    "credit__date": "01.02.2020",
    "credit__number": "98765",
    "credit__number_of_months": "360",
    "credit__total": "100000.00",
    "interest": "5.50",
    "ircc": "3.00",
    "margin": "1.25",
}


def make_first_page(header=HEADER, footer=FOOTER):
    rows = (
        f"{header}\n"
        "de viață de grup\n"
        "17.12.2026 1470.27 875.8 594.47 169188.96 50.02\n"
        f"{footer}\n"
        "end"
    )
    return mock.Mock(
        extract_text=mock.Mock(return_value=f"summary\nTABEL DE AMORTIZARE\n{rows}")
    )


def test_extract_first_page_accepts_new_homebank_header():
    account = SimpleNamespace(id=1)
    credit = SimpleNamespace(id=2)
    logger = mock.MagicMock()
    with (
        mock.patch.object(
            timetable, "extract_summary", return_value=SUMMARY_DATA
        ) as extract_summary,
        mock.patch.object(
            timetable.Account.objects, "get_or_create", return_value=(account, True)
        ),
        mock.patch.object(
            timetable.Credit.objects, "get_or_create", return_value=(credit, True)
        ),
        mock.patch.object(timetable, "backup_finance_model") as backup,
    ):
        result = timetable.extract_first_page(make_first_page(), logger)

    extract_summary.assert_called_once_with("summary\n")
    assert result.credit_id == credit.id
    assert result.date.isoformat() == "2026-11-22"
    assert result.amortization_table == [
        {
            "date": "17.12.2026",
            "total": "1470.27",
            "interest": "875.8",
            "principal": "594.47",
            "remaining": "169188.96",
            "insurance": "50.02",
        }
    ]
    assert logger.warning.call_count == 2
    assert [call.kwargs for call in backup.call_args_list] == [
        {"model": "Account"},
        {"model": "Credit"},
    ]


def test_extract_first_page_rejects_missing_title():
    page = mock.Mock(extract_text=mock.Mock(return_value="No table"))

    with pytest.raises(timetable.TimetableImportError, match="first page"):
        timetable.extract_first_page(page, mock.MagicMock())


def test_extract_first_page_rejects_unrecognized_header():
    page = make_first_page(header="Date Amount Interest")

    with pytest.raises(timetable.TimetableImportError, match="Format has changed"):
        timetable.extract_first_page(page, mock.MagicMock())


def test_extract_first_page_rejects_invalid_footer():
    page = make_first_page(footer="Unexpected footer")

    with pytest.raises(timetable.TimetableImportError, match="footer format"):
        timetable.extract_first_page(page, mock.MagicMock())


def test_extract_rows_maps_all_columns():
    assert timetable.extract_rows(
        ["17.12.2026 1470.27 875.8 594.47 169188.96 50.02"]
    ) == [
        {
            "date": "17.12.2026",
            "total": "1470.27",
            "interest": "875.8",
            "principal": "594.47",
            "remaining": "169188.96",
            "insurance": "50.02",
        }
    ]
    assert timetable.extract_rows([]) == []


def test_extract_amortization_table_checks_page_number():
    page = mock.Mock(
        extract_text=mock.Mock(
            return_value=(
                "17.12.2026 1470.27 875.8 594.47 169188.96 50.02\ntable footer\n2/5"
            )
        )
    )

    assert timetable.extract_amortization_table([page]) == timetable.extract_rows(
        ["17.12.2026 1470.27 875.8 594.47 169188.96 50.02"]
    )

    page.extract_text.return_value = "row\nfooter\n3/5"
    with pytest.raises(timetable.TimetableImportError, match="current page"):
        timetable.extract_amortization_table([page])


def test_extract_summary_parses_account_credit_and_rate_values():
    summary = "\n".join(
        [
            "Cod Client 123456",
            "Numele Doe Prenumele Jane",
            "Număr cont 789",
            "Număr şi data contract credit 98765 -",
            "01.02.2020",
            "Rata dobânzii fixă i",
            "primii 5 ani: 5,50",
            "Rata dobânzii variabilă folosită",
            "începând cu al 6\xadlea an al duratei",
            "creditului",
            "4.25 compusă din:",
            "Marjă: +1.25 şi Indice IRCC: 3.00",
            "Valoare credit 100.000,00 Moneda RON",
            "Scadenţarul este generat pentru o",
            "perioadă de 360 luni",
        ]
    )

    assert timetable.extract_summary(summary) == SUMMARY_DATA


def test_extract_summary_parses_fields_merged_onto_same_line():
    summary = "\n".join(
        [
            "Cod Client 123456",
            "Numele Doe Prenumele Jane",
            "Număr cont 789",
            "Număr şi data contract credit 98765 -01.02.2020 "
            "Rata dobânzii fixă înprimii 5 ani: 5,50",
            "Rata dobânzii variabilă folosită",
            "începând cu al 6\xadlea an al duratei",
            "creditului",
            "4.25 compusă din:",
            "Marjă: +1.25 şi Indice IRCC: 3.00",
            "Valoare credit 100.000,00 Moneda RON",
            "Scadenţarul este generat pentru o",
            "perioadă de 360 luni",
        ]
    )

    assert timetable.extract_summary(summary) == SUMMARY_DATA


def test_extract_summary_rejects_unexpected_format():
    with pytest.raises(ValueError, match="Line does not match"):
        timetable.extract_summary("Unexpected summary")


def make_import_mocks():
    timetable_record = SimpleNamespace(
        amortization_table=[],
        save=mock.Mock(),
    )
    reader = SimpleNamespace(pages=[object(), object()])
    return timetable_record, reader


def test_import_timetable_from_path():
    timetable_record, reader = make_import_mocks()
    logger = mock.MagicMock()
    with (
        mock.patch.object(timetable, "PdfReader", return_value=reader) as pdf_reader,
        mock.patch.object(
            timetable, "extract_first_page", return_value=timetable_record
        ),
        mock.patch.object(
            timetable,
            "extract_amortization_table",
            return_value=[{"date": "18.12.2026"}],
        ),
        mock.patch.object(timetable, "backup_finance_model") as backup,
    ):
        result = timetable.import_timetable("timetable.pdf", logger)

    pdf_reader.assert_called_once_with("timetable.pdf")
    assert result is timetable_record
    assert result.amortization_table == [{"date": "18.12.2026"}]
    result.save.assert_called_once_with()
    backup.assert_called_once_with(model="Timetable")


def test_import_timetable_from_uploaded_file():
    timetable_record, reader = make_import_mocks()
    uploaded_file = mock.Mock(read=mock.Mock(return_value=b"pdf data"))
    with (
        mock.patch.object(timetable, "PdfReader", return_value=reader) as pdf_reader,
        mock.patch.object(
            timetable, "extract_first_page", return_value=timetable_record
        ),
        mock.patch.object(timetable, "extract_amortization_table", return_value=[]),
        mock.patch.object(timetable, "backup_finance_model"),
    ):
        timetable.import_timetable(uploaded_file, mock.MagicMock())

    assert isinstance(pdf_reader.call_args.args[0], io.BytesIO)
    assert pdf_reader.call_args.args[0].getvalue() == b"pdf data"
    uploaded_file.read.assert_called_once_with()


@pytest.mark.parametrize(
    "save_error",
    [
        IntegrityError("integrity error"),
        ValidationError("validation error"),
        ValueError("invalid value"),
    ],
)
def test_import_timetable_wraps_database_validation_errors(save_error):
    timetable_record, reader = make_import_mocks()
    timetable_record.save.side_effect = save_error
    logger = mock.MagicMock()
    with (
        mock.patch.object(timetable, "PdfReader", return_value=reader),
        mock.patch.object(
            timetable, "extract_first_page", return_value=timetable_record
        ),
        mock.patch.object(timetable, "extract_amortization_table", return_value=[]),
        mock.patch.object(timetable, "backup_finance_model") as backup,
        pytest.raises(timetable.TimetableImportError),
    ):
        timetable.import_timetable("timetable.pdf", logger)

    logger.exception.assert_called_once_with("Failed to create timetable record")
    backup.assert_not_called()
