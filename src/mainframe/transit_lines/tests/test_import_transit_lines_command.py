import types
from contextlib import contextmanager
from unittest.mock import MagicMock, call, patch

import pytest

# Framework note:
# - Tests use pytest with pytest-django if available
#   (django_db marks not required here because DB writes are
#    mocked via bulk_create).
# - We patch external dependencies to keep tests fast and
#   deterministic.

# updated at runtime below
MODULE_UNDER_TEST = "mainframe.transit_lines.tests.test_import_transit_lines_command"

# We import the Command class via its real module path
# so the test validates the public interface.
# To determine the correct path, we try the expected Django
# management command module first.
# If paths differ in this repository, adjust IMPORT_PATH accordingly.
IMPORT_PATHS = [
    # Typical Django command module path
    "mainframe.transit_lines.management.commands.import_transit_lines",
    # Fallback: sometimes the command may be placed differently
    "mainframe.transit_lines.commands.import_transit_lines",
]


def _import_command_module():
    last_exc = None
    for path in IMPORT_PATHS:
        try:
            mod = __import__(path, fromlist=["Command"])
            # Basic sanity check: the module should define Command
            # with handle/handle_async
            if hasattr(mod, "Command") and hasattr(mod.Command, "handle_async"):
                return mod, path
        except Exception as e:  # pragma: no cover
            # diagnostics for path resolution only
            last_exc = e
            continue
    if last_exc:
        raise last_exc
    raise ImportError("Could not locate the import_transit_lines Command module.")


command_module, MODULE_UNDER_TEST = _import_command_module()
Command = command_module.Command


# Utilities


def _fake_sync_to_async():
    """
    Return a stand-in for asgiref.sync.sync_to_async that wraps a
    sync function into an async callable, preserving args and
    kwargs for assertions.
    """

    def wrapper(func):
        async def run(*args, **kwargs):
            return func(*args, **kwargs)

        return run

    return wrapper


@contextmanager
def patched_dependencies(
    *,
    line_type_choices=(("bus", "Bus"), ("tram", "Tram")),
    lines_by_type=None,
    schedules_list=None,
    raise_on_type=None,
):
    """
    Patch:
      - TransitLine.LINE_TYPE_CHOICES
      - TransitLine.objects.bulk_create
      - asgiref.sync.sync_to_async
      - mainframe.clients.ctp.CTPClient
      - mainframe.clients.healthchecks.ping
      - logging.getLogger to a MagicMock for .info calls

    Parameters:
      - line_type_choices: sequence of (value, label)
      - lines_by_type: dict mapping type -> list of line objects
      - schedules_list: list of schedule objects (MagicMock)
      - raise_on_type: type value for which fetch_lines raises
        FetchTransitLinesException
    """
    if lines_by_type is None:
        lines_by_type = {
            "bus": [
                MagicMock(name="line-bus-1"),
                MagicMock(name="line-bus-2"),
            ],
            "tram": [MagicMock(name="line-tram-1")],
        }
    if schedules_list is None:
        schedules_list = [
            MagicMock(name="sched-1"),
            MagicMock(name="sched-2"),
        ]

    # Resolve symbols we will patch by string path anchored on
    # the real module path
    path_sync_to_async = "asgiref.sync.sync_to_async"
    path_health_ping = "mainframe.clients.healthchecks.ping"
    path_ctp_client = "mainframe.clients.ctp.CTPClient"
    path_ctp_exc = "mainframe.clients.ctp.FetchTransitLinesException"
    path_transit_line = "mainframe.transit_lines.models.TransitLine"
    path_logging_getlogger = "logging.getLogger"

    with (
        patch(path_sync_to_async, _fake_sync_to_async()),
        patch(
            path_transit_line + ".LINE_TYPE_CHOICES",
            tuple(line_type_choices),
        ),
        patch(
            path_transit_line + ".objects.bulk_create",
            autospec=True,
        ) as mock_bulk_create,
        patch(path_ctp_client) as MockClient,
    ):
        # Prepare CTPClient mock instance
        mock_client_instance = MagicMock(name="CTPClientInstance")

        def _fetch_lines(line_type, commit=False):
            if raise_on_type is not None and line_type == raise_on_type:
                # FetchTransitLinesException from real module
                exc_type = __import__(
                    path_ctp_exc.rsplit(".", 1)[0],
                    fromlist=[path_ctp_exc.rsplit(".", 1)[-1]],
                ).__dict__["FetchTransitLinesException"]
                raise exc_type(f"failed for {line_type}")
            return list(lines_by_type.get(line_type, []))

        async def _fetch_schedules(commit=False):
            # Emulate async generator/iterable behavior if needed.
            # In code, it's list(await client.fetch_schedules(...))
            return list(schedules_list)

        mock_client_instance.fetch_lines.side_effect = _fetch_lines
        mock_client_instance.fetch_schedules.side_effect = _fetch_schedules
        MockClient.return_value = mock_client_instance

        with (
            patch(path_health_ping) as mock_ping,
            patch(path_logging_getlogger) as mock_get_logger,
        ):
            logger = MagicMock(name="logger")
            mock_get_logger.return_value = logger
            yield types.SimpleNamespace(
                mock_bulk_create=mock_bulk_create,
                mock_client_class=MockClient,
                mock_client=mock_client_instance,
                mock_ping=mock_ping,
                logger=logger,
            )


@pytest.mark.describe("ImportTransitLines management command")
class TestImportTransitLinesCommand:
    def test_handle_runs_async_entrypoint(self):
        # Verify synchronous handle() delegates to asyncio.run(handle_async)
        cmd = Command()
        with patch("asyncio.run") as mock_run:
            cmd.handle()
            mock_run.assert_called_once()
            # Ensure it was called with the coroutine from handle_async()
            assert callable(mock_run.call_args.args[0])

    def test_successful_sync_imports_lines_and_schedules_and_pings(self, capsys):
        cmd = Command()
        with patched_dependencies() as deps:
            cmd.handle()  # handle wraps asyncio.run

            # Assert line fetch per type with commit=False
            expected_types = ["bus", "tram"]
            assert deps.mock_client.fetch_lines.call_args_list == [
                call(t, commit=False) for t in expected_types
            ]

            # bulk_create called once with the union of lines and
            # update options
            assert deps.mock_bulk_create.call_count == 1
            args, kwargs = deps.mock_bulk_create.call_args
            lines_arg = args[1] if len(args) > 1 else kwargs.get("objs")
            # safety
            assert isinstance(lines_arg, list)
            assert len(lines_arg) == 3  # 2 bus + 1 tram by default
            assert kwargs.get("update_conflicts") is True
            assert kwargs.get("update_fields") == [
                "car_type",
                "line_type",
                "terminal1",
                "terminal2",
            ]
            assert kwargs.get("unique_fields") == ["name"]

            # fetch_schedules called once with commit=True
            deps.mock_client.fetch_schedules.assert_called_once_with(commit=True)

            # stdout contains the success message
            captured = capsys.readouterr()
            assert "Synced 3 transit lines and 2 schedules" in captured.out

            # logger.info called for start and success message
            assert any(
                "Importing transit lines" in str(args[0])
                for args, _ in deps.logger.info.call_args_list
            )
            assert any(
                "Synced 3 transit lines and 2 schedules" in str(args[0])
                for args, _ in deps.logger.info.call_args_list
            )

            # healthchecks ping sent with "transit"
            deps.mock_ping.assert_called_once()
            ping_args, ping_kwargs = deps.mock_ping.call_args
            assert ping_args[1] == "transit"

    def test_no_lines_no_schedules_still_logs_and_pings(self, capsys):
        cmd = Command()
        with patched_dependencies(
            lines_by_type={"bus": [], "tram": []},
            schedules_list=[],
        ) as deps:
            cmd.handle()
            # bulk_create called with empty list
            args, kwargs = deps.mock_bulk_create.call_args
            lines_arg = args[1] if len(args) > 1 else kwargs.get("objs")
            assert isinstance(lines_arg, list)
            assert len(lines_arg) == 0

            deps.mock_client.fetch_schedules.assert_called_once_with(commit=True)

            captured = capsys.readouterr()
            assert "Synced 0 transit lines and 0 schedules" in captured.out
            deps.mock_ping.assert_called_once()

    def test_multiple_line_types_aggregated(self):
        # Introduce three types and varying counts to verify
        # aggregation and call order
        types_choices = (
            ("bus", "Bus"),
            ("tram", "Tram"),
            ("metro", "Metro"),
        )
        lines_map = {
            "bus": [MagicMock(), MagicMock()],
            "tram": [MagicMock()],
            "metro": [MagicMock(), MagicMock(), MagicMock()],
        }
        cmd = Command()
        with patched_dependencies(
            line_type_choices=types_choices,
            lines_by_type=lines_map,
            schedules_list=[MagicMock()],
        ) as deps:
            cmd.handle()
            # Calls per type in order of LINE_TYPE_CHOICES
            assert deps.mock_client.fetch_lines.call_args_list == [
                call("bus", commit=False),
                call("tram", commit=False),
                call("metro", commit=False),
            ]
            # bulk_create received 6 lines
            args, kwargs = deps.mock_bulk_create.call_args
            lines_arg = args[1] if len(args) > 1 else kwargs.get("objs")
            assert len(lines_arg) == 6

    def test_raises_command_error_when_fetch_lines_fails(self):
        # When a single type fails, CommandError should be raised
        # and no further processing occurs
        cmd = Command()
        types_choices = (("bus", "Bus"), ("tram", "Tram"))
        with patched_dependencies(
            line_type_choices=types_choices,
            raise_on_type="bus",
        ) as deps:
            with pytest.raises(Exception) as excinfo:
                cmd.handle()
            # The exception should be Django's CommandError
            # (wrapping FetchTransitLinesException)
            assert excinfo.type.__name__ == "CommandError"
            # Ensure no schedules fetch nor health ping happened
            deps.mock_client.fetch_schedules.assert_not_called()
            deps.mock_ping.assert_not_called()

    def test_commit_flags_are_correct(self):
        cmd = Command()
        with patched_dependencies() as deps:
            cmd.handle()
            # fetch_lines called with commit=False
            for ca in deps.mock_client.fetch_lines.call_args_list:
                assert ca.kwargs.get("commit") is False
            # fetch_schedules called with commit=True
            assert (
                deps.mock_client.fetch_schedules.call_args.kwargs.get("commit") is True
            )
