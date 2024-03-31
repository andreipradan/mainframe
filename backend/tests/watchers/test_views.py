from unittest import mock

import pytest
from django.urls import reverse

from tests.factories.watchers import WatcherFactory


@mock.patch("watchers.models.schedule_watcher", return_value="{}")
@mock.patch("watchers.serializers.redis_client.get", return_value="{}")
@pytest.mark.django_db
class TestWatcherViews:
    def test_create(self, _, __, client, staff_session):
        response = client.post(
            "/api/watchers/",
            data={
                "name": "foo",
                "selector": ".foo-selector",
                "url": "https://example.com",
            },
            HTTP_AUTHORIZATION=staff_session.token,
        )
        assert response.status_code == 201, response.content
        assert response.data == {
            "id": mock.ANY,
            "created_at": mock.ANY,
            "cron": "",
            "is_active": False,
            "latest": {},
            "name": "foo",
            "redis": {},
            "request": {},
            "selector": ".foo-selector",
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
            "created_at": mock.ANY,
            "cron": "",
            "id": watcher.id,
            "is_active": True,
            "latest": {},
            "name": "",
            "redis": {},
            "request": {},
            "selector": ".foo-selector",
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
            "previous": None,
            "results": [
                {
                    "created_at": mock.ANY,
                    "cron": "",
                    "id": watcher.id,
                    "is_active": True,
                    "latest": {},
                    "name": "",
                    "redis": {},
                    "request": {},
                    "selector": ".foo-selector",
                    "updated_at": mock.ANY,
                    "url": "",
                }
            ],
        }
