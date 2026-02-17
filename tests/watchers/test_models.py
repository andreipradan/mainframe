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
class TestWatcherRun:
    @freeze_time("2026-02-06 00:14:00")
    def test_run_no_results_sends_pending_at_cron(self):
        w = WatcherFactory(
            url="http://example.com",
            selector="a",
            cron_notification="14 * * * *",
            cron="14 * * * *",
            pending_data=[{"title": "old", "url": "u"}],
        )

        with mock.patch.object(Watcher, "fetch", return_value=[]):
            sent = {"called": False, "data": None, "muted": None}

            def fake_send(self, results, muted=False):
                sent["called"] = True
                sent["data"] = results
                sent["muted"] = muted

            with (
                mock.patch.object(Watcher, "send_notification", fake_send),
                mute_signals(post_save),
            ):
                w.run()

        assert sent["called"] is True
        assert sent["data"] == [{"title": "old", "url": "u"}]
        assert sent["muted"] is True  # Pending data is sent muted
        w.refresh_from_db()
        assert w.pending_data == []

    @freeze_time("2026-02-06 00:15:00")
    def test_run_accumulates_pending_data_outside_notification_window(self):
        w = WatcherFactory(
            url="http://example.com",
            selector="a",
            cron_notification="14 * * * *",  # Only notify at minute 14
            pending_data=[],
        )

        with (
            mock.patch.object(
                Watcher, "fetch", return_value=[{"title": "new1", "url": "u1"}]
            ),
            mock.patch.object(Watcher, "send_notification"),
            mute_signals(post_save),
        ):
            w.run()

        w.refresh_from_db()
        assert w.pending_data == [{"title": "new1", "url": "u1"}]

    @freeze_time("2026-02-06 00:25:00")
    def test_run_accumulates_multiple_results_before_notification(self):
        w = WatcherFactory(
            url="http://example.com",
            selector="a",
            cron_notification="14 * * * *",
            pending_data=[{"title": "result1", "url": "u1"}],
        )

        # Second run at minute 25 finds more items
        with mock.patch.object(
            Watcher, "fetch", return_value=[{"title": "result2", "url": "u2"}]
        ):
            sent = {"called": False, "data": None}

            def fake_send(self, results, muted=False):
                sent["called"] = True
                sent["data"] = results

            with (
                mock.patch.object(Watcher, "send_notification", fake_send),
                mute_signals(post_save),
            ):
                w.run()

        # Should NOT send yet (minute 25, notification at minute 14)
        assert sent["called"] is False
        w.refresh_from_db()
        # Should accumulate both results
        assert w.pending_data == [
            {"title": "result2", "url": "u2"},
            {"title": "result1", "url": "u1"},
        ]

    @freeze_time("2026-02-06 01:14:00")
    def test_run_sends_accumulated_data_at_notification_time(self):
        """Accumulated data should be sent when notification cron matches."""
        w = WatcherFactory(
            url="http://example.com",
            selector="a",
            cron_notification="14 * * * *",
            cron="14 * * * *",
            pending_data=[
                {"title": "result2", "url": "u2"},
                {"title": "result1", "url": "u1"},
            ],
        )

        with mock.patch.object(Watcher, "fetch", return_value=[]):
            sent = {"called": False, "data": None, "muted": None}

            def fake_send(self, results, muted=False):
                sent["called"] = True
                sent["data"] = results
                sent["muted"] = muted

            with (
                mock.patch.object(Watcher, "send_notification", fake_send),
                mute_signals(post_save),
            ):
                w.run()

        assert sent["called"] is True
        # Should send all accumulated data as muted
        assert sent["data"] == [
            {"title": "result2", "url": "u2"},
            {"title": "result1", "url": "u1"},
        ]
        assert sent["muted"] is True
        w.refresh_from_db()
        assert w.pending_data == []

    def test_pending_data_respects_telegram_size_limit(self):
        existing_pending = [
            {"title": "existing item", "url": "http://example.com/existing"}
        ]
        w = WatcherFactory(
            url="http://example.com",
            name="Test Watcher",
            selector="a",
            cron_notification="14 * * * *",
            pending_data=existing_pending,
        )

        # Create many items to exceed the 4096 char limit
        # Each item will be: "{N}. <a href='URL'>TITLE</a>" plus newline
        # With large titles to exceed the limit quickly
        long_title = "x" * 3000  # 3000 chars per title
        new_results = [
            {
                "title": f"{long_title} item{i}",
                "url": f"http://example.com/item{i}",
            }
            for i in range(5)  # 5 items of 3000 chars each would be 15KB
        ]

        with (
            mock.patch.object(Watcher, "fetch", return_value=new_results),
            mock.patch.object(Watcher, "send_notification"),
            mute_signals(post_save),
        ):
            w.run()

        w.refresh_from_db()
        # Should trim to fit in 4096 char limit (including header and footer)
        # Not all 5 new items should fit
        assert len(w.pending_data) < 5, (
            "Should drop items that exceed message size limit"
        )
        assert len(w.pending_data) > 0, "Should keep at least some items"

        # Verify message would fit in Telegram limit
        header = "📣 <b>Test Watcher</b> 📣\n"
        footer = "\nMore articles: <a href='http://example.com'>here</a>"
        items_text = "\n".join(
            [
                f"{f'{i + 1}. ' if len(w.pending_data) > 1 else ''}"
                f"<a href='{item['url']}' target='_blank'>{item['title']}</a>"
                for i, item in enumerate(w.pending_data)
            ]
        )
        total_message = f"{header}{items_text}{footer}"
        assert len(total_message) <= 4096, (
            "Accumulated message should fit in Telegram limit"
        )


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
