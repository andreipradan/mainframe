from contextlib import contextmanager
from unittest import mock

import pytest


@pytest.fixture(autouse=True)
def mock_capture_command_logs():
    """Mock capture_command_logs to avoid logfire warnings in tests."""

    @contextmanager
    def no_op_context(*args, **kwargs):
        yield

    with mock.patch("mainframe.watchers.models.capture_command_logs", no_op_context):
        yield
