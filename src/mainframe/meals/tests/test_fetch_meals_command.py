import logging
from io import StringIO
from unittest import mock

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

"""
Testing library and framework:
- Using pytest with pytest-django conventions (function-style tests, monkeypatch/mocks).
- Tests exercise a Django management command's public interface via call_command.
- External dependencies (MealsClient.fetch_meals, healthchecks.ping) are mocked.
"""

# Resolve the management command module path.
# In many Django projects, the command would be implemented at:
#   mainframe/meals/management/commands/fetch_meals.py
# with a Command class exporting .handle()
# If the project uses a different module path,
# update COMMAND_NAME or import paths accordingly.
COMMAND_NAME = "fetch_meals"


try:
    from mainframe.clients.meals import FetchMealsException
except ImportError:

    class FetchMealsException(Exception):
        pass


def _patch_logger_level(caplog):
    # Ensure we capture INFO-level logs from the command's logger
    caplog.set_level(logging.INFO)
    # Also capture root logger to be safe
    logging.getLogger().setLevel(logging.INFO)


@pytest.mark.django_db(transaction=False)
def test_fetch_meals_happy_path_logs_and_pings(caplog):
    """
    Happy path:
    - MealsClient.fetch_meals returns a non-empty list.
    - Command logs start and completion with count.
    - Writes 'Done.' to stdout using style.SUCCESS.
    - healthchecks.ping(logger, 'meals') is called once at the end.
    """
    _patch_logger_level(caplog)

    # Patch MealsClient.fetch_meals and healthchecks.ping
    with (
        mock.patch(
            "mainframe.clients.meals.MealsClient.fetch_meals",
            return_value=[{"id": 1}, {"id": 2}],
        ) as mock_fetch,
        mock.patch("mainframe.clients.healthchecks.ping") as mock_ping,
    ):
        # call_command supports stdout/stderr file-like objects
        # use mocks with .write recorded
        # However, Django wraps style.SUCCESS, so easier is to pass StringIO
        stdout = StringIO()
        stderr = StringIO()

        call_command(COMMAND_NAME, stdout=stdout, stderr=stderr)

        # Verify external calls
        mock_fetch.assert_called_once_with()
        assert mock_ping.call_count == 1
        # Validate ping called with a logger and 'meals' tag
        args, kwargs = mock_ping.call_args
        assert len(args) >= 2
        assert isinstance(args[0], logging.Logger)
        assert args[1] == "meals"

        # Validate logs
        logs_text = "\n".join(rec.getMessage() for rec in caplog.records)
        assert "Fetching menu for the next month" in logs_text
        assert "Fetched 2 meals" in logs_text

        # Validate stdout contains success message "Done."
        out_text = stdout.getvalue()
        assert "Done." in out_text
        # No errors expected
        assert stderr.getvalue() == ""


@pytest.mark.django_db(transaction=False)
def test_fetch_meals_empty_list_still_logs_and_pings(caplog):
    """
    Edge case:
    - MealsClient.fetch_meals returns an empty list.
    - Command should log 'Fetched 0 meals', still write success, and ping healthchecks.
    """
    _patch_logger_level(caplog)

    with (
        mock.patch(
            "mainframe.clients.meals.MealsClient.fetch_meals",
            return_value=[],
        ) as mock_fetch,
        mock.patch("mainframe.clients.healthchecks.ping") as mock_ping,
    ):
        stdout = StringIO()
        stderr = StringIO()

        call_command(COMMAND_NAME, stdout=stdout, stderr=stderr)

        mock_fetch.assert_called_once_with()
        mock_ping.assert_called_once()

        logs_text = "\n".join(rec.getMessage() for rec in caplog.records)
        assert "Fetching menu for the next month" in logs_text
        assert "Fetched 0 meals" in logs_text

        assert "Done." in stdout.getvalue()
        assert stderr.getvalue() == ""


@pytest.mark.django_db(transaction=False)
def test_fetch_meals_raises_fetch_meals_exception_as_command_error(caplog):
    """
    Failure path:
    - MealsClient.fetch_meals raises FetchMealsException.
    - Command should raise CommandError with the original exception chained.
    - healthchecks.ping must NOT be called on failure path.
    """
    _patch_logger_level(caplog)

    exc = FetchMealsException("network failure")

    with (
        mock.patch(
            "mainframe.clients.meals.MealsClient.fetch_meals",
            side_effect=exc,
        ) as mock_fetch,
        mock.patch("mainframe.clients.healthchecks.ping") as mock_ping,
    ):
        stdout = StringIO()
        stderr = StringIO()

        with pytest.raises(CommandError) as err_ctx:
            call_command(COMMAND_NAME, stdout=stdout, stderr=stderr)

        # Assert the underlying message is surfaced
        assert "network failure" in str(err_ctx.value)
        mock_fetch.assert_called_once_with()
        mock_ping.assert_not_called()

        # Start log should still appear; completion log should not
        logs_text = "\n".join(rec.getMessage() for rec in caplog.records)
        assert "Fetching menu for the next month" in logs_text
        assert "Fetched " not in logs_text  # no completion log on failure

        # No success message expected on stdout since exception aborted the command
        assert "Done." not in stdout.getvalue()
        # Django may capture error output
        # we simply ensure stderr contains something or
        # remains empty depending on settings
        # The key contract here is exception raised
        # no strict assertion on stderr contents


@pytest.mark.django_db(transaction=False)
def test_logger_namespace_is_module_name(caplog):
    """
    Contract check:
    - The command creates a logger via logging.getLogger(__name__).
    - Validate that emitted records include a logger name
      ending with the command module name.
    """
    _patch_logger_level(caplog)

    with mock.patch(
        "mainframe.clients.meals.MealsClient.fetch_meals",
        return_value=[1],
    ) as _:
        stdout = StringIO()
        stderr = StringIO()

        call_command(COMMAND_NAME, stdout=stdout, stderr=stderr)

        # Inspect logger names captured
        logger_names = {rec.name for rec in caplog.records}
        # Expect at least one logger name referencing the command module
        # Many projects place the command at
        # mainframe.meals.management.commands.fetch_meals
        assert any(
            name.endswith("fetch_meals") or "commands.fetch_meals" in name
            for name in logger_names
        ), f"Unexpected logger names: {logger_names}"


@pytest.mark.django_db(transaction=False)
def test_healthchecks_ping_receives_logger_instance(caplog):
    """
    Robustness check:
    - Ensure we pass a real logger into healthchecks.ping.
    """
    _patch_logger_level(caplog)

    captured_logger = {}

    def _capture_logger(logger_obj, tag):
        captured_logger["logger"] = logger_obj
        captured_logger["tag"] = tag

    with (
        mock.patch(
            "mainframe.clients.meals.MealsClient.fetch_meals",
            return_value=[{"id": 42}],
        ),
        mock.patch(
            "mainframe.clients.healthchecks.ping",
            side_effect=_capture_logger,
        ),
    ):
        stdout = StringIO()
        stderr = StringIO()

        call_command(COMMAND_NAME, stdout=stdout, stderr=stderr)

        assert isinstance(captured_logger.get("logger"), logging.Logger)
        assert captured_logger.get("tag") == "meals"
