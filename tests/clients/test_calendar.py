from unittest import mock

import pytest
from googleapiclient.errors import HttpError
from rest_framework import status

from mainframe.clients import calendar


class DummyEvent:
    def __init__(
        self,
        id,
        addresses=None,
        duration="1h",
        type="Accidental",
    ):
        self.id = id
        self.location = "loc"
        self.start = "2026-01-01T00:00:00"
        self.addresses = addresses or ["A", "B"]
        self.duration = duration
        self.type = type

    def to_calendar_event(self):
        return {"id": self.id, "location": self.location}


@pytest.fixture(autouse=True)
def patch_env_and_clients(monkeypatch):
    # Prevent external network / real credentials from being used.
    fake_env = mock.MagicMock()
    fake_env.return_value = "fake"
    monkeypatch.setattr(calendar.environ, "Env", lambda: fake_env)

    credentials = mock.MagicMock()
    monkeypatch.setattr(
        calendar.Credentials,
        "from_service_account_file",
        lambda *args, **kwargs: credentials,
    )

    # Mock Redis, service and batch behavior.
    redis_mock = mock.MagicMock()
    monkeypatch.setattr(calendar, "RedisClient", lambda *args, **kwargs: redis_mock)

    service_mock = mock.MagicMock()
    events_mock = mock.MagicMock()
    service_mock.events.return_value = events_mock
    monkeypatch.setattr(calendar, "build", lambda *args, **kwargs: service_mock)

    batch_mock = mock.MagicMock()
    monkeypatch.setattr(
        calendar, "BatchHttpRequest", lambda *args, **kwargs: batch_mock
    )

    # Prevent asyncio.run from requiring a coroutine
    monkeypatch.setattr(calendar.asyncio, "run", lambda coro: coro)

    return {
        "redis": redis_mock,
        "service": service_mock,
        "events": events_mock,
        "batch": batch_mock,
    }


def test_clear_events_no_items(patch_env_and_clients):
    client = calendar.CalendarClient()
    # list() returns no items
    patch_env_and_clients["events"].list.return_value.execute.return_value = {
        "items": []
    }

    client.clear_events(calendar.TYPE_PLANNED_TODAY, branch="X")

    # Batch should not run because no events to delete
    patch_env_and_clients["batch"].execute.assert_not_called()


def test_clear_events_deletes_items(patch_env_and_clients):
    client = calendar.CalendarClient()
    patch_env_and_clients["events"].list.return_value.execute.return_value = {
        "items": [{"id": "e1"}, {"id": "e2"}]
    }

    client.clear_events(calendar.TYPE_PLANNED_15_DAYS, branch="X")

    # Should add a delete request for each event
    assert patch_env_and_clients["events"].delete.call_count == 2
    assert all(
        mock.call(calendarId="fake", eventId=event_id)
        in patch_env_and_clients["events"].delete.call_args_list
        for event_id in ["e1", "e2"]
    )
    patch_env_and_clients["batch"].execute.assert_called_once()


def test_create_events_uses_batch(patch_env_and_clients):
    client = calendar.CalendarClient()
    event = DummyEvent(id="e1")

    client.create_events([event])

    # ensure we saved events by id
    assert client.events["e1"] is event
    assert patch_env_and_clients["events"].insert.call_args_list == [
        mock.call(calendarId="fake", body=event.to_calendar_event(), sendUpdates="none")
    ]
    assert patch_env_and_clients["batch"].execute.call_args_list == [mock.call()]


def test_event_callback_success_triggers_notification(
    monkeypatch, patch_env_and_clients
):
    client = calendar.CalendarClient()
    event = DummyEvent(id="abc")
    client.events = {"abc": event}

    called = {}

    def fake_handle_notification(response, event_arg, is_update=False):
        called["response"] = response
        called["event"] = event_arg
        called["is_update"] = is_update

    monkeypatch.setattr(client, "handle_notification", fake_handle_notification)

    client.event_callback("abc", {"etag": "E"}, None)

    assert called == {
        "response": {"etag": "E"},
        "event": event,
        "is_update": False,
    }


def test_event_callback_conflict_calls_update(monkeypatch, patch_env_and_clients):
    client = calendar.CalendarClient()
    client.events = {"abc": DummyEvent(id="abc")}

    called = {}

    def fake_update(event_id):
        called["event_id"] = event_id

    monkeypatch.setattr(client, "update", fake_update)

    class DummyResp:
        status = status.HTTP_409_CONFLICT

    dummy_exc = ValueError("conflict")
    dummy_exc.resp = DummyResp()

    client.event_callback("abc", {}, dummy_exc)

    assert called == {"event_id": "abc"}


def test_event_callback_other_error_logs(monkeypatch, patch_env_and_clients):
    log = mock.MagicMock()
    client = calendar.CalendarClient(logger=log)
    client.events = {"abc": DummyEvent(id="abc")}

    client.event_callback("abc", {}, ValueError("err"))

    assert log.bind.call_args_list == [
        mock.call(calendar_id="fake"),
    ]
    assert log.bind().error.call_args_list == [
        mock.call(
            "Calendar event creation failed",
            request_id="abc",
            exception="err",
        )
    ]


def test_handle_notification_sets_redis_and_sends_message(patch_env_and_clients):
    client = calendar.CalendarClient()
    event = DummyEvent(
        id="evt", addresses=["A", "B"], duration="10m", type="Accidental"
    )

    response = {
        "etag": "tag",
        "start": {"dateTime": "2026-01-01T00:00:00Z"},
        "end": {"dateTime": "2026-01-01T01:00:00Z"},
        "htmlLink": "https://example.com",
    }

    send_mock = mock.MagicMock()
    with mock.patch.object(calendar, "send_telegram_message", send_mock):
        client.handle_notification(response, event, is_update=True)

    # Check Redis set call
    assert patch_env_and_clients["redis"].set.call_args_list == [
        mock.call("calendar:evt", "tag")
    ]

    # Check Telegram message call
    assert send_mock.call_args_list == [
        mock.call(
            "*Updated Accidental outage*\n"
            "Start: 2026-01-01T00:00:00Z\n"
            "End: 2026-01-01T01:00:00Z\n"
            "Duration: 10m\n\n"
            "Locations:\nA\nB\n\n"
            "[details here](https://example.com)."
        )
    ]


def test_update_triggers_notification_when_etag_changes(
    patch_env_and_clients, monkeypatch
):
    client = calendar.CalendarClient()
    event = DummyEvent(id="evt")
    client.events = {"evt": event}

    response = {"etag": "new"}
    patch_env_and_clients["events"].update.return_value.execute.return_value = response
    patch_env_and_clients["redis"].get.return_value = "old"

    called = {}

    def fake_handle_notification(response_arg, event_arg, is_update=False):
        called["is_update"] = is_update
        called["event"] = event_arg

    monkeypatch.setattr(client, "handle_notification", fake_handle_notification)

    client.update("evt")

    assert called == {"is_update": True, "event": event}


def test_update_does_not_notify_when_etag_same(patch_env_and_clients, monkeypatch):
    client = calendar.CalendarClient()
    event = DummyEvent(id="evt")
    client.events = {"evt": event}

    response = {"etag": "same"}
    patch_env_and_clients["events"].update.return_value.execute.return_value = response
    patch_env_and_clients["redis"].get.return_value = "same"

    called = {"notified": False}

    def fake_handle_notification(*args, **kwargs):
        called["notified"] = True

    monkeypatch.setattr(client, "handle_notification", fake_handle_notification)

    client.update("evt")

    assert called == {"notified": False}


def test_update_recreates_on_404(patch_env_and_clients):
    client = calendar.CalendarClient()
    event = DummyEvent(id="evt")
    client.events = {"evt": event}

    class DummyResp:
        status = status.HTTP_404_NOT_FOUND

    err = HttpError(resp=mock.MagicMock(), content=b"not found")
    err.resp = DummyResp()

    patch_env_and_clients["events"].update.return_value.execute.side_effect = err

    client.update("evt")

    # Should call insert to recreate the event
    assert patch_env_and_clients["events"].insert.call_args_list == [
        mock.call(calendarId="fake", body=event, sendUpdates="none")
    ]


def test_update_logs_other_http_errors(patch_env_and_clients):
    log = mock.MagicMock()
    client = calendar.CalendarClient(logger=log)
    event = DummyEvent(id="evt")
    client.events = {"evt": event}

    class DummyResp:
        status = status.HTTP_500_INTERNAL_SERVER_ERROR

    err = HttpError(resp=mock.MagicMock(), content=b"error")
    err.resp = DummyResp()

    patch_env_and_clients["events"].update.return_value.execute.side_effect = err

    client.update("evt")

    assert log.bind.call_args_list == [mock.call(calendar_id="fake")]
    assert log.bind().exception.call_args_list == [
        mock.call("Failed to update event", event_id=event.id)
    ]
