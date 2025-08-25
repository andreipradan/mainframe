from datetime import datetime
from unittest.mock import MagicMock, patch
import importlib
import pytest
import argparse


def _import_command_module():
    """
    Attempt to import the Command class from likely locations.
    Falls back to dynamic import via importlib if custom layout is used.
    """
    candidates = [
        # Common Django pathing for a command named "backup"
        "mainframe.bots.management.commands.backup",
        "mainframe.management.commands.backup",
        "mainframe.bots.commands.backup",
        # Fallback: module colocated as part of bots package
        "mainframe.bots.backup_command",
    ]
    last_err = None
    for mod_name in candidates:
        try:
            mod = importlib.import_module(mod_name)
            if hasattr(mod, "Command"):
                return mod
        except Exception as e:  # pragma: no cover - import probing
            last_err = e
            continue

    # As a final fallback, try loading via explicit file path
    # if PYTHONPATH includes src/
    raise AssertionError(
        f"Could not locate Command module in expected locations. Last error: {last_err}"
    )


@pytest.fixture()
def command_cls():
    mod = _import_command_module()
    return mod.Command


@pytest.fixture()
def fixed_now():
    # Fixed timestamp: 2025-08-25 15:04:05 (UTC naive)
    return datetime(2025, 8, 25, 15, 4, 5)


@pytest.fixture()
def logger_mock():
    # Provide a fake logger the command will retrieve via logging.getLogger(__name__)
    class DummyLogger:
        def __init__(self):
            self.info = MagicMock()
            self.debug = MagicMock()
            self.warning = MagicMock()
            self.error = MagicMock()

    return DummyLogger()


def _expected_filename(dt: datetime) -> str:
    return dt.strftime("%Y_%m_%d_%H_%M_%S.json.gz")


def _expected_destination(app: str, model: str, dt: datetime) -> str:
    file_name = _expected_filename(dt)
    return f"{app}_{(model.lower() + '_') if model else ''}{file_name}"


def test_handle_happy_path_app_only(command_cls, fixed_now, logger_mock):
    with patch("django.utils.timezone.now") as tz_now, \
         patch("django.core.management.call_command") as call_cmd, \
         patch("mainframe.clients.storage.GoogleCloudStorageClient") as GCSClient, \
         patch("mainframe.clients.system.run_cmd") as run_cmd, \
         patch("mainframe.clients.healthchecks.ping") as hc_ping, \
         patch("logging.getLogger") as get_logger:
        tz_now.return_value = fixed_now
        get_logger.return_value = logger_mock

        # Arrange
        cmd = command_cls()
        app = "core"
        options = {"app": app, "model": ""}

        # Act
        cmd.handle(**options)

        # Assert filename and call_command usage
        expected_file = _expected_filename(fixed_now)
        call_cmd.assert_called_once_with(
            "dumpdata",
            app,
            output=expected_file,
            verbosity=2,
        )

        # Assert GCS upload called with expected destination
        GCSClient.assert_called_once_with(logger_mock)
        client_instance = GCSClient.return_value
        client_instance.upload_blob_from_file.assert_called_once_with(
            expected_file, f"{app}_{expected_file}"
        )

        # Assert temp file removed
        run_cmd.assert_called_once_with(f"rm {expected_file}")

        # Assert logging and stdout
        logger_mock.info.assert_called_with("Done")
        hc_ping.assert_called_once_with(logger_mock, f"{app.upper()}_BACKUP")


def test_handle_happy_path_with_model_name_transforms(command_cls,
                                                     fixed_now,
                                                     logger_mock):
    with patch("django.utils.timezone.now") as tz_now, \
         patch("django.core.management.call_command") as call_cmd, \
         patch("mainframe.clients.storage.GoogleCloudStorageClient") as GCSClient, \
         patch("mainframe.clients.system.run_cmd") as run_cmd, \
         patch("mainframe.clients.healthchecks.ping") as hc_ping, \
         patch("logging.getLogger") as get_logger:
        tz_now.return_value = fixed_now
        get_logger.return_value = logger_mock

        cmd = command_cls()
        app = "accounts"
        # Verify .title() used in source and .lower() used in
        # destination
        model = "user"
        options = {"app": app, "model": model}

        cmd.handle(**options)

        expected_file = _expected_filename(fixed_now)
        # Source should be "accounts.User"
        call_cmd.assert_called_once_with(
            "dumpdata",
            f"{app}.User",
            output=expected_file,
            verbosity=2,
        )

        # Destination should be "accounts_user_<timestamp>.json.gz"
        client_instance = GCSClient.return_value
        client_instance.upload_blob_from_file.assert_called_once_with(
            expected_file, f"{app}_{model.lower()}_{expected_file}"
        )
        run_cmd.assert_called_once_with(f"rm {expected_file}")
        hc_ping.assert_called_once_with(logger_mock, f"{app.upper()}_BACKUP")


def test_handle_propagates_errors_and_skips_followups_on_dump_failure(
    command_cls, fixed_now, logger_mock
):
    with patch("django.utils.timezone.now") as tz_now, \
         patch(
             "django.core.management.call_command",
             side_effect=RuntimeError("dump failed"),
         ), \
         patch("mainframe.clients.storage.GoogleCloudStorageClient") as GCSClient, \
         patch("mainframe.clients.system.run_cmd") as run_cmd, \
         patch("mainframe.clients.healthchecks.ping") as hc_ping, \
         patch("logging.getLogger") as get_logger:
        tz_now.return_value = fixed_now
        get_logger.return_value = logger_mock

        cmd = command_cls()
        app = "core"
        options = {"app": app, "model": ""}

        with pytest.raises(RuntimeError, match="dump failed"):
            cmd.handle(**options)

        # No upload/remove/ping when dumpdata fails
        GCSClient.assert_not_called()
        run_cmd.assert_not_called()
        hc_ping.assert_not_called()
        # Should not log "Done"
        logger_mock.info.assert_not_called()


def test_handle_bubble_up_on_cleanup_failure(command_cls,
                                            fixed_now,
                                            logger_mock):
    with patch("django.utils.timezone.now") as tz_now, \
         patch("django.core.management.call_command") as call_cmd, \
         patch("mainframe.clients.storage.GoogleCloudStorageClient") as GCSClient, \
         patch(
             "mainframe.clients.system.run_cmd",
             side_effect=RuntimeError("rm failed"),
         ), \
         patch("mainframe.clients.healthchecks.ping") as hc_ping, \
         patch("logging.getLogger") as get_logger:
        tz_now.return_value = fixed_now
        get_logger.return_value = logger_mock

        cmd = command_cls()
        app = "core"
        options = {"app": app, "model": ""}

        with pytest.raises(RuntimeError, match="rm failed"):
            cmd.handle(**options)

        # Upload should have happened before failing rm
        GCSClient.assert_called_once_with(logger_mock)
        GCSClient.return_value.upload_blob_from_file.assert_called_once()
        call_cmd.assert_called_once()
        # Healthchecks ping and "Done" should not occur after failure
        hc_ping.assert_not_called()
        logger_mock.info.assert_not_called()


def test_add_arguments_parser_configuration(command_cls):
    parser = argparse.ArgumentParser()
    cmd = command_cls()
    cmd.add_arguments(parser)

    # --app is required string
    app_arg = next(a for a in parser._actions if "--app" in a.option_strings)
    assert app_arg.type is str
    assert app_arg.required is True

    # --model is optional string with default ""
    model_arg = next(a for a in parser._actions if "--model" in a.option_strings)
    assert model_arg.type is str
    assert model_arg.required is False
    assert model_arg.default == ""