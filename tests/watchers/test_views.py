import logging
from unittest import mock

import pytest
from django.urls import reverse

from tests.factories.watchers import WatcherFactory


@mock.patch("mainframe.watchers.models.schedule_task", return_value="{}")
@mock.patch("mainframe.watchers.serializers.get_redis_client", return_value={})
@pytest.mark.django_db
class TestWatcherViews:
    def test_create(self, _, __, client, staff_session):
        response = client.post(
            "/watchers/",
            data={
                "name": "foo",
                "selector": ".foo-selector",
                "url": "https://example.com",
            },
            HTTP_AUTHORIZATION=staff_session.token,
        )
        assert response.status_code == 201, response.content
        assert response.data == {
            "chat_id": None,
            "created_at": mock.ANY,
            "cron": "",
            "cron_description": "",
            "id": mock.ANY,
            "is_active": False,
            "latest": {},
            "log_level": logging.WARNING,
            "name": "foo",
            "redis": {},
            "request": {},
            "selector": ".foo-selector",
            "top": False,
            "updated_at": mock.ANY,
            "url": "https://example.com",
        }

    def test_detail(self, _, __, client, staff_session):
        watcher = WatcherFactory()
        response = client.get(
            reverse("api:watchers-detail", args=[watcher.id]),
            HTTP_AUTHORIZATION=staff_session.token,
        )
        assert response.status_code == 200
        assert response.json() == {
            "chat_id": None,
            "created_at": mock.ANY,
            "cron": "0 0 31 2 0",
            "cron_description": "At 12:00 AM, on day 31 of the month, "
            "only on Sunday, only in February",
            "id": watcher.id,
            "is_active": False,
            "latest": {},
            "log_level": logging.WARNING,
            "name": mock.ANY,
            "redis": {},
            "request": {},
            "selector": ".foo-selector",
            "top": True,
            "updated_at": mock.ANY,
            "url": "",
        }

    def test_list(self, _, __, client, staff_session):
        watcher = WatcherFactory()
        response = client.get(
            reverse("api:watchers-list"),
            HTTP_AUTHORIZATION=staff_session.token,
        )
        assert response.status_code == 200
        assert response.json() == {
            "count": 1,
            "next": None,
            "page_size": 25,
            "previous": None,
            "results": [
                {
                    "chat_id": None,
                    "created_at": mock.ANY,
                    "cron": "0 0 31 2 0",
                    "cron_description": "At 12:00 AM, on day 31 of the month, "
                    "only on Sunday, only in February",
                    "id": watcher.id,
                    "is_active": False,
                    "latest": {},
                    "log_level": logging.WARNING,
                    "name": mock.ANY,
                    "redis": {},
                    "request": {},
                    "selector": ".foo-selector",
                    "top": True,
                    "updated_at": mock.ANY,
                    "url": "",
                }
            ],
        }
