from datetime import datetime
from types import SimpleNamespace
from unittest import mock

import pytest
from django.db.models.signals import post_save
from factory.django import mute_signals
from freezegun import freeze_time

from mainframe.watchers.models import (
    Watcher,
    WatcherElementsNotFound,
    WatcherError,
    extract,
    fetch_api,
    fetch_web,
)
from tests.factories.watchers import WatcherFactory


@pytest.mark.django_db
class TestWatcherNotification:
    @freeze_time("2026-02-06 00:14:00")
    def test_should_notify_stored_respects_cron(self):
        w = WatcherFactory(
            url="http://example.com",
            selector="a",
            has_new_data=True,
            cron_notification="14 * * * *",
        )

        # respects cron_notification
        assert Watcher.should_notify(w, None) is True

    @freeze_time("2026-02-06 00:15:00")
    def test_should_notify_stored_respects_cron_outside_time(self):
        w = WatcherFactory(
            url="http://example.com",
            selector="a",
            has_new_data=True,
            cron_notification="14 * * * *",
        )

        # does not notify outside of cron time
        assert Watcher.should_notify(w, None) is False

    def test_should_notify_new_results_breaking_and_no_cron(self):
        w = WatcherFactory(url="http://example.com", selector="a")
        results = [{"title": "Normal item"}]
        assert w.should_notify(results) is True

        w.cron_notification = "14 * * * *"
        results = [{"title": "Breaking: big"}]
        assert w.should_notify(results) is True


@pytest.mark.django_db
class TestWatcherRun:
    @freeze_time("2026-02-06 00:14:00")
    def test_run_no_results_sends_stored_at_cron(self):
        w = WatcherFactory(
            url="http://example.com",
            selector="a",
            cron_notification="14 * * * *",
            has_new_data=True,
            latest={
                "data": [{"title": "old", "url": "u"}],
                "timestamp": datetime.now().isoformat(),
            },
        )

        # ensure fetch returns no new items
        with mock.patch.object(Watcher, "fetch", return_value=[]):
            sent = {"called": False}

            def fake_send(*_, **__):
                sent["called"] = True

            with mock.patch.object(Watcher, "send_notification", fake_send):
                with mute_signals(post_save):
                    w.run()

        assert sent["called"] is True
        w.refresh_from_db()
        assert w.has_new_data is False

    @freeze_time("2026-02-06 00:15:00")
    def test_run_with_results_sets_latest_and_defers_notification(self):
        w = WatcherFactory(
            url="http://example.com",
            selector="a",
            cron_notification="14 * * * *",
            has_new_data=False,
        )

        # simulate new results found
        with mock.patch.object(
            Watcher, "fetch", return_value=[{"title": "new", "url": "u2"}]
        ):
            called = {"sent": False}

            def fake_send(self, results):
                called["sent"] = True

            with mock.patch.object(Watcher, "send_notification", fake_send):
                with mute_signals(post_save):
                    w.run()

        w.refresh_from_db()
        # notification should be deferred
        assert called["sent"] is False
        assert w.has_new_data is True


class DummyResponse:
    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload


class DummyElement:
    def __init__(self, text, href):
        self.text = text
        self.attrs = {"href": href}


class DummySoup:
    def __init__(self, elements):
        self._elements = elements

    def select(self, selector):
        return self._elements


@pytest.mark.django_db
class TestWatcherHelpers:
    def test_extract_nested(self):
        data = {"a": {"b": {"c": 1}}}
        assert extract(data, ["a", "b", "c"]) == 1

    def test_fetch_api_success(self):
        w = WatcherFactory(url="http://api", selector="items title url")
        payload = {"items": [{"title": "T1", "url": "http://u"}]}

        def fake_fetch(url, logger, retries=1, soup=False, **kwargs):
            return DummyResponse(payload), None

        with mock.patch("mainframe.watchers.models.fetch", fake_fetch):
            res = fetch_api(w, None)

        assert isinstance(res, list)
        assert res[0]["title"] == "T1"

    def test_fetch_api_bad_selector_raises(self):
        w = WatcherFactory(url="http://api", selector="one two")

        def fake_fetch(url, logger, retries=1, soup=False, **kwargs):
            return DummyResponse({}), None

        logger = SimpleNamespace(info=lambda *a, **k: None)
        with (
            mock.patch("mainframe.watchers.models.fetch", fake_fetch),
            pytest.raises(WatcherError),
        ):
            fetch_api(w, logger)

    def test_fetch_web_success(self):
        w = WatcherFactory(url="http://example.com/path", selector="a.link")

        el = DummyElement("Title", "/item/1")
        soup = DummySoup([el])

        def fake_fetch(url, logger, retries=1, **kwargs):
            return soup, None

        with mock.patch("mainframe.watchers.models.fetch", fake_fetch):
            res = fetch_web(w, None)

        assert isinstance(res, list)
        assert res[0]["url"].startswith("http://example.com")

    def test_fetch_web_no_elements_raises(self):
        w = WatcherFactory(url="http://example.com", selector="a")

        soup = DummySoup([])

        def fake_fetch(url, logger, retries=1, **kwargs):
            return soup, None

        with (
            mock.patch("mainframe.watchers.models.fetch", fake_fetch),
            pytest.raises(WatcherElementsNotFound),
        ):
            fetch_web(w, None)

    def test_send_notification_uses_telegram(self):
        w = WatcherFactory(url="http://example.com", selector="a")
        results = [{"title": "One", "url": "http://x"}]

        called = {"args": None}

        async def fake_send_telegram(msg, **kwargs):
            called["args"] = (msg, kwargs)

        with mock.patch(
            "mainframe.watchers.models.send_telegram_message", fake_send_telegram
        ):
            w.send_notification(results)

        assert called["args"] is not None
        assert w.name in called["args"][0]
