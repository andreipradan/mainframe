import sys
from types import SimpleNamespace
from unittest.mock import MagicMock, call
from importlib import import_module

import pytest

# Note about testing framework:
# These tests are written for pytest (with pytest-django if available).
# They should also run under plain pytest by skipping database usage and
# mocking Django components.

# Under test: should_notify() and Command.handle()
# from the check devices command.
# The PR diff emphasized message composition and notification
# triggers; tests focus on those behaviors.

# Utilities to fabricate "device" objects with a
# 'should_notify_presence' attribute and __str__.
class DummyDevice:
    def __init__(self, name, should_notify_presence):
        self.name = name
        self.should_notify_presence = should_notify_presence

    def __str__(self):
        return self.name


@pytest.fixture
def fake_parse_mode(monkeypatch):
    # Provide a fake telegram.constants.ParseMode to avoid external dependency
    fake_constants = SimpleNamespace(ParseMode=SimpleNamespace(HTML="HTML"))
    # Insert fake module before the command module is imported
    sys.modules.setdefault("telegram", SimpleNamespace(constants=fake_constants))
    sys.modules.setdefault("telegram.constants", fake_constants)
    yield
    # Cleanup: not strictly necessary since module cache is per-process


def import_command_module(monkeypatch, fake_parse_mode):
    """
    Import the command module safely with external deps mocked.
    Returns (mod, should_notify func, Command class).
    """
    # Mock logger to be a MagicMock to let us assert info logging if we want
    # But we'll patch logger via module attribute after import to keep code simple.

    # Avoid importing real clients by pre-stubbing their modules
    sys.modules.setdefault("mainframe.clients", SimpleNamespace())
    sys.modules.setdefault("mainframe.clients.chat", SimpleNamespace())
    sys.modules.setdefault("mainframe.clients.devices", SimpleNamespace())
    sys.modules.setdefault("mainframe.clients.healthchecks", SimpleNamespace())
    sys.modules.setdefault(
        "mainframe.sources",
        SimpleNamespace(models=SimpleNamespace()),
    )
    sys.modules.setdefault(
        "mainframe.sources.models",
        SimpleNamespace(Source=MagicMock()),
    )

    # The file under test is expected at
    # mainframe.devices.management.commands.check_devices
    # but the snippet path may differ.
    # Try that canonical path first; if it fails,
    # fall back to mainframe.devices.check_devices or
    # mainframe.devices.commands.check_devices.
    candidates = [
        "mainframe.devices.management.commands.check_devices",
        "mainframe.devices.check_devices",
        "mainframe.devices.commands.check_devices",
        # In case the PR placed code directly under
        # devices/tests for demonstration (unlikely):
        "src.mainframe.devices.tests.test_check_devices_command",
    ]

    last_exc = None
    for modname in candidates:
        try:
            if modname in sys.modules:
                # reload to pick up monkeypatches
                del sys.modules[modname]
            mod = import_module(modname)
            if hasattr(mod, "Command") and hasattr(mod, "should_notify"):
                return mod, mod.should_notify, mod.Command
        except Exception as e:
            last_exc = e

    # If unable to import, raise the last encountered exception
    # to aid debugging.
    raise last_exc or ImportError(
        "Could not import command module from known locations."
    )


@pytest.fixture
def command_module(monkeypatch, fake_parse_mode):
    mod, should_notify, Command = import_command_module(
        monkeypatch, fake_parse_mode
    )
    return mod


@pytest.fixture
def should_notify_fn(command_module):
    return command_module.should_notify


@pytest.fixture
def command_cls(command_module):
    return command_module.Command


def test_should_notify_filters_and_stringifies(should_notify_fn):
    devices = [
        DummyDevice("Alpha", True),
        DummyDevice("Bravo", False),
        DummyDevice("Charlie", True),
    ]
    result = should_notify_fn(devices)
    assert result == ["Alpha", "Charlie"]


def test_should_notify_empty(should_notify_fn):
    assert should_notify_fn([]) == []
    devices = [
        DummyDevice("X", False),
        DummyDevice("Y", False),
    ]
    assert should_notify_fn(devices) == []


@pytest.mark.django_db(transaction=False)
def test_handle_no_changes_no_telegram_and_healthcheck_and_log(
    monkeypatch,
    command_cls,
    command_module,
):
    # Mock Source.objects.default() -> source
    fake_source_mgr = MagicMock()
    fake_source_mgr.objects.default.return_value = "SRC"
    monkeypatch.setattr(
        command_module,
        "Source",
        fake_source_mgr,
        raising=True,
    )

    # Mock DevicesClient to return no changes
    fake_client = MagicMock()
    fake_client.run.return_value = ([], [], [])
    fake_devices_client_cls = MagicMock(return_value=fake_client)
    monkeypatch.setattr(
        command_module,
        "DevicesClient",
        fake_devices_client_cls,
        raising=True,
    )

    # Spy on send_telegram_message to ensure not called
    send_tele_called = MagicMock()

    async def fake_send_telegram_message(msg, logger=None, parse_mode=None):
        send_tele_called(msg=msg, logger=logger, parse_mode=parse_mode)
        return "ok"

    monkeypatch.setattr(
        command_module,
        "send_telegram_message",
        fake_send_telegram_message,
        raising=True,
    )

    # Mock healthchecks.ping
    fake_hc = MagicMock()
    monkeypatch.setattr(
        command_module,
        "healthchecks",
        SimpleNamespace(ping=fake_hc.ping),
        raising=True,
    )

    # Mock logger
    fake_logger = MagicMock()
    monkeypatch.setattr(
        command_module,
        "logger",
        fake_logger,
        raising=True,
    )

    # Execute handle
    cmd = command_cls()
    cmd.handle()

    # Assertions
    fake_devices_client_cls.assert_called_once_with("SRC", logger=fake_logger)
    fake_client.run.assert_called_once_with()
    assert send_tele_called.call_count == 0  # no telegram when msg empty
    fake_logger.info.assert_called_with("Done")
    fake_hc.ping.assert_called_once()
    # arg check: second arg is 'devices' per code
    assert fake_hc.ping.call_args == call(fake_logger, "devices")


@pytest.mark.django_db(transaction=False)
@pytest.mark.parametrize(
    "case_params",
    [
        # singular cases
        (["A"], [], [], "⚠️ 1 new device joined: A"),
        ([], ["B"], [], "🌝 1 device went online: B"),
        ([], [], ["C"], "🚪 1 device went offline: C"),
        # plurals and composition
        (["A", "B"], [], [], "⚠️ 2 new devices joined: A, B"),
        ([], ["B", "C"], [], "🌝 2 devices went online: B, C"),
        ([], [], ["D", "E"], "🚪 2 devices went offline: D, E"),
        # combinations with newlines
        (
            ["A"],
            ["B"],
            ["C", "D"],
            "⚠️ 1 new device joined: A\n"
            "🌝 1 device went online: B\n"
            "🚪 2 devices went offline: C, D",
        ),
    ],
)
def test_handle_message_composition_and_telegram(
    monkeypatch,
    command_cls,
    command_module,
    case_params,
):
    new, online, offline, expected = case_params

    # Prepare device instances with should_notify_presence=True
    # so should_notify() includes them
    def mkdev(name):
        return DummyDevice(name, True)

    new_devices = [mkdev(n) for n in new]
    online_devices = [mkdev(n) for n in online]
    offline_devices = [mkdev(n) for n in offline]

    # Source default
    fake_source_mgr = MagicMock()
    fake_source_mgr.objects.default.return_value = "SRC"
    monkeypatch.setattr(
        command_module,
        "Source",
        fake_source_mgr,
        raising=True,
    )

    # DevicesClient
    fake_client = MagicMock()
    fake_client.run.return_value = (
        new_devices,
        online_devices,
        offline_devices,
    )
    fake_devices_client_cls = MagicMock(return_value=fake_client)
    monkeypatch.setattr(
        command_module,
        "DevicesClient",
        fake_devices_client_cls,
        raising=True,
    )

    captured = {}

    async def fake_send_telegram_message(msg, logger=None, parse_mode=None):
        captured["msg"] = msg
        captured["logger"] = logger
        captured["parse_mode"] = parse_mode
        return "ok"

    monkeypatch.setattr(
        command_module,
        "send_telegram_message",
        fake_send_telegram_message,
        raising=True,
    )

    fake_hc = MagicMock()
    monkeypatch.setattr(
        command_module,
        "healthchecks",
        SimpleNamespace(ping=fake_hc.ping),
        raising=True,
    )

    fake_logger = MagicMock()
    monkeypatch.setattr(
        command_module,
        "logger",
        fake_logger,
        raising=True,
    )

    cmd = command_cls()
    cmd.handle()

    # Message exactly matches expected format and ordering
    assert captured["msg"] == expected

    # ParseMode.HTML is passed through
    assert captured["parse_mode"] == command_module.ParseMode.HTML

    # Healthcheck ping at end
    fake_hc.ping.assert_called_once_with(fake_logger, "devices")

    # DevicesClient constructed with default source
    fake_devices_client_cls.assert_called_once_with(
        "SRC",
        logger=fake_logger,
    )
    fake_client.run.assert_called_once_with()


@pytest.mark.django_db(transaction=False)
def test_handle_skips_devices_not_requiring_notification(
    monkeypatch,
    command_cls,
    command_module,
):
    # Some devices have should_notify_presence=False so
    # they should be filtered out
    new_devices = [DummyDevice("N1", False)]
    online_devices = [DummyDevice("O1", False), DummyDevice("O2", True)]
    offline_devices = [DummyDevice("F1", False), DummyDevice("F2", False)]

    fake_source_mgr = MagicMock()
    fake_source_mgr.objects.default.return_value = "SRC"
    monkeypatch.setattr(
        command_module,
        "Source",
        fake_source_mgr,
        raising=True,
    )

    fake_client = MagicMock()
    fake_client.run.return_value = (
        new_devices,
        online_devices,
        offline_devices,
    )
    fake_devices_client_cls = MagicMock(return_value=fake_client)
    monkeypatch.setattr(
        command_module,
        "DevicesClient",
        fake_devices_client_cls,
        raising=True,
    )

    captured = {}

    async def fake_send_telegram_message(msg, logger=None, parse_mode=None):
        captured["msg"] = msg
        return "ok"

    monkeypatch.setattr(
        command_module,
        "send_telegram_message",
        fake_send_telegram_message,
        raising=True,
    )

    fake_hc = MagicMock()
    monkeypatch.setattr(
        command_module,
        "healthchecks",
        SimpleNamespace(ping=fake_hc.ping),
        raising=True,
    )

    fake_logger = MagicMock()
    monkeypatch.setattr(
        command_module,
        "logger",
        fake_logger,
        raising=True,
    )

    cmd = command_cls()
    cmd.handle()

    # Only O2 remains; new and offline are empty after filtering
    assert captured["msg"] == "🌝 1 device went online: O2"


@pytest.mark.django_db(transaction=False)
def test_handle_devices_client_failure_propagates_and_no_telegram(
    monkeypatch,
    command_cls,
    command_module,
):
    fake_source_mgr = MagicMock()
    fake_source_mgr.objects.default.return_value = "SRC"
    monkeypatch.setattr(
        command_module,
        "Source",
        fake_source_mgr,
        raising=True,
    )

    fake_devices_client_cls = MagicMock()
    fake_client = MagicMock()
    fake_client.run.side_effect = RuntimeError("boom")
    fake_devices_client_cls.return_value = fake_client
    monkeypatch.setattr(
        command_module,
        "DevicesClient",
        fake_devices_client_cls,
        raising=True,
    )

    # Ensure send_telegram_message would record if called
    send_tele_called = MagicMock()

    async def fake_send_telegram_message(msg, logger=None, parse_mode=None):
        send_tele_called(msg=msg, logger=logger, parse_mode=parse_mode)
        return "ok"

    monkeypatch.setattr(
        command_module,
        "send_telegram_message",
        fake_send_telegram_message,
        raising=True,
    )

    fake_hc = MagicMock()
    monkeypatch.setattr(
        command_module,
        "healthchecks",
        SimpleNamespace(ping=fake_hc.ping),
        raising=True,
    )

    fake_logger = MagicMock()
    monkeypatch.setattr(
        command_module,
        "logger",
        fake_logger,
        raising=True,
    )

    cmd = command_cls()

    with pytest.raises(RuntimeError, match="boom"):
        cmd.handle()

    # No telegram, no healthcheck ping on failure before completion
    assert send_tele_called.call_count == 0
    assert fake_hc.ping.call_count == 0