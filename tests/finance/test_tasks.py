import sys
from types import SimpleNamespace
from unittest import mock

import pytest

from mainframe.finance import tasks
from mainframe.finance.models import Transaction


class QuerySetStub(list):
    def count(self):
        return len(self)

    def filter(self, **kwargs):
        return self

    def exclude(self, **kwargs):
        return self

    def values(self, *fields):
        return self


def test_backup_finance_model_skips_local_backup():
    with (
        mock.patch("mainframe.finance.tasks.settings.ENV", "local"),
        mock.patch("mainframe.finance.tasks.backup_finance") as backup,
        mock.patch("mainframe.finance.tasks.module_logger") as logger,
    ):
        tasks.backup_finance_model("CryptoPnL")

    backup.assert_not_called()
    logger.warning.assert_called_once_with(
        "Attempted to backup in local env", model="CryptoPnL"
    )


def test_backup_finance_model_schedules_backup_outside_local():
    with (
        mock.patch("mainframe.finance.tasks.settings.ENV", "test"),
        mock.patch("mainframe.finance.tasks.backup_finance") as backup,
    ):
        tasks.backup_finance_model("CryptoPnL")

    backup.assert_called_once_with("CryptoPnL")


def test_backup_finance_runs_management_command():
    with mock.patch("mainframe.finance.tasks.call_command") as call_command:
        tasks.backup_finance.call_local("CryptoPnL")

    call_command.assert_called_once_with("backup", app="finance", model="CryptoPnL")


def test_predict_updates_transactions_and_reports_progress():
    queryset = QuerySetStub({"id": index} for index in range(1001))
    predictions = list(range(1001))
    logger = mock.MagicMock()
    sklearn = SimpleNamespace(predict=mock.MagicMock(return_value=predictions))
    modules = {
        "pandas": SimpleNamespace(DataFrame=lambda rows: list(rows)),
        "mainframe.clients.prediction": SimpleNamespace(SKLearn=sklearn),
    }
    with (
        mock.patch.dict(sys.modules, modules),
        mock.patch.object(Transaction.objects, "bulk_update") as bulk_update,
        mock.patch("mainframe.finance.tasks.log_status") as log_status,
    ):
        result = tasks.predict.call_local(queryset, logger)

    assert len(result) == 1001
    assert result[0].category_suggestion_id == 0
    assert result[-1].category_suggestion_id == 1000
    bulk_update.assert_called_once_with(
        result,
        fields=("category_suggestion_id",),
        batch_size=1000,
    )
    assert log_status.call_args_list[0].args == ("predict",)
    assert log_status.call_args_list[0].kwargs["operation"] == "2/3 mapping predictions"
    assert log_status.call_args_list[-1].kwargs["progress"] == 100


def test_train_rejects_empty_dataset():
    queryset = QuerySetStub()
    logger = mock.MagicMock()
    modules = {
        "pandas": SimpleNamespace(DataFrame=lambda rows: list(rows)),
        "mainframe.clients.prediction": SimpleNamespace(
            SKLearn=SimpleNamespace(train=mock.MagicMock())
        ),
    }
    with (
        mock.patch.dict(sys.modules, modules),
        mock.patch.object(Transaction.objects, "expenses", return_value=queryset),
        mock.patch("mainframe.finance.tasks.log_status") as log_status,
        pytest.raises(ValueError, match="No trained data"),
    ):
        tasks.train.call_local(logger)

    log_status.assert_any_call(
        "train", status=tasks.SIGNAL_ERROR, error="No trained data"
    )


def test_train_runs_model_training():
    queryset = QuerySetStub(
        [
            {"description": "coffee", "category": 1},
            {"description": "groceries", "category": 2},
        ]
    )
    logger = mock.MagicMock()
    sklearn = SimpleNamespace(train=mock.MagicMock(return_value="trained"))
    modules = {
        "pandas": SimpleNamespace(DataFrame=lambda rows: list(rows)),
        "mainframe.clients.prediction": SimpleNamespace(SKLearn=sklearn),
    }
    with (
        mock.patch.dict(sys.modules, modules),
        mock.patch.object(Transaction.objects, "expenses", return_value=queryset),
        mock.patch("mainframe.finance.tasks.log_status") as log_status,
    ):
        result = tasks.train.call_local(logger)

    assert result == "trained"
    sklearn.train.assert_called_once()
    logger.info.assert_called_once_with("Training on confirmed transactions", count=2)
    log_status.assert_any_call("train", count=2)
