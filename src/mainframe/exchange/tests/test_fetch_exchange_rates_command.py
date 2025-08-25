# ---------------------------------------------------------------------------
# Tests for the fetch_exchange_rates management command
# Test framework: pytest + pytest-django
# These tests validate the public behavior of the management command's handle()
# method, focusing on:
#  - Correct client selection and invocation with the "full" flag
#  - Logging of start and completion messages
#  - Translation of FetchExchangeRatesException to CommandError
#  - Healthcheck ping on success (and not on failure)
# ---------------------------------------------------------------------------

import io
import logging
import pytest
from django.core.management.base import CommandError

from mainframe.exchange.management.commands import fetch_exchange_rates as fetch_cmd


def _make_client(return_count=1, assert_full=None, ctor_spy=None, state=None, exc=None):
    """
    Factory for dummy client classes used to simulate BNR/ECB clients.

    - return_count: value returned by .fetch()
    - assert_full: if not None, assert the .fetch(full=...) flag equals this
    - ctor_spy: dict to record the logger passed into constructor
    - state: dict to track call count and args of .fetch()
    - exc: exception to raise from .fetch(), if provided
    """
    class DummyClient:
        def __init__(self, logger):
            if ctor_spy is not None:
                ctor_spy["logger"] = logger

        def fetch(self, full=False):
            if assert_full is not None:
                assert isinstance(full, bool)
                assert full is assert_full
            if state is not None:
                state["calls"] = state.get("calls", 0) + 1
                state.setdefault("args", []).append(full)
            if exc is not None:
                raise exc
            return return_count

    return DummyClient


@pytest.mark.parametrize(
    "source,full,return_count",
    [
        ("bnr", False, 3),
        ("bnr", True, 2),
        ("ecb", False, 0),
        ("ecb", True, 7),
    ],
)
def test_handle_success_logs_outputs_and_healthcheck(
    source,
    full,
    return_count,
    monkeypatch,
    caplog,
):
    # Arrange
    ctor_spy = {}
    state = {}
    ping_calls = []

    monkeypatch.setattr(
        fetch_cmd,
        "CLIENTS",
        {
            source: _make_client(
                return_count,
                assert_full=full,
                ctor_spy=ctor_spy,
                state=state,
            )
        },
        raising=True,
    )

    def fake_ping(logger, slug):
        ping_calls.append((logger, slug))

    monkeypatch.setattr(
        fetch_cmd.healthchecks,
        "ping",
        fake_ping,
        raising=True,
    )

    cmd = fetch_cmd.Command()
    cmd.stdout = io.StringIO()

    # Act
    with caplog.at_level(logging.INFO, logger=fetch_cmd.logger.name):
        cmd.handle(source=source, full=full)

    # Assert: stdout shows success
    out = cmd.stdout.getvalue()
    assert "Done." in out

    # Assert: logs for start and finish include correct source and count
    joined_msgs = " | ".join(caplog.messages)
    assert f"Fetching {source.upper()} exchange rates" in joined_msgs
    assert f"Fetched {source.upper()} {return_count} exchange rates" in joined_msgs

    # Assert: client ctor received the module logger and fetch called once
    # with expected flag
    assert ctor_spy.get("logger") is fetch_cmd.logger
    assert state.get("calls") == 1
    assert state.get("args") == [full]

    # Assert: healthcheck pinged with the right slug and logger
    assert ping_calls == [(fetch_cmd.logger, f"{source}-fx")]


def test_handle_translates_client_exception_to_CommandError(monkeypatch, caplog):
    # Arrange
    ping_calls = []
    monkeypatch.setattr(
        fetch_cmd.healthchecks,
        "ping",
        lambda logger, slug: ping_calls.append((logger, slug)),
        raising=True,
    )

    exc = fetch_cmd.FetchExchangeRatesException("rate-limiter")
    monkeypatch.setattr(
        fetch_cmd,
        "CLIENTS",
        {"bnr": _make_client(exc=exc)},
        raising=True,
    )

    cmd = fetch_cmd.Command()
    cmd.stdout = io.StringIO()

    # Act / Assert
    with caplog.at_level(
        logging.INFO,
        logger=fetch_cmd.logger.name,
    ), pytest.raises(CommandError) as ei:
        cmd.handle(source="bnr", full=False)

    assert "rate-limiter" in str(ei.value)
    # Only the "Fetching ..." log should be present; no "Fetched ..." on failure
    assert any("Fetching BNR exchange rates" in m for m in caplog.messages)
    assert not any("Fetched BNR" in m for m in caplog.messages)
    # Healthcheck must not be pinged on failure
    assert ping_calls == []


def test_handle_invalid_source_raises_keyerror_and_does_not_ping(monkeypatch):
    # Even though the CLI parser restricts choices,
    # ensure defensive behavior if handle() is invoked
    # with an unexpected source.
    monkeypatch.setattr(
        fetch_cmd,
        "CLIENTS",
        {},
        raising=True,
    )

    ping_calls = []
    monkeypatch.setattr(
        fetch_cmd.healthchecks,
        "ping",
        lambda logger, slug: ping_calls.append((logger, slug)),
        raising=True,
    )

    cmd = fetch_cmd.Command()
    cmd.stdout = io.StringIO()

    with pytest.raises(KeyError):
        cmd.handle(source="invalid", full=True)

    assert ping_calls == []


# End of tests