from unittest import mock

import pytest
from django.urls import reverse

from tests.factories.watchers import WatcherFactory


@pytest.mark.django_db
class TestWatcherViews:
    def test_create(self, client, staff_session):
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
            "updated_at": mock.ANY,
            "is_active": False,
            "latest": {},
            "name": "foo",
            "request": {},
            "selector": ".foo-selector",
            "url": "https://example.com",
        }

    def test_detail(self, client, staff_session):
        watcher = WatcherFactory()
        response = client.get(
            reverse("api:watchers-detail", args=[watcher.id]),
            HTTP_AUTHORIZATION=staff_session.token,
        )
        assert response.status_code == 200
        assert response.json() == {
            "created_at": mock.ANY,
            "id": watcher.id,
            "is_active": True,
            "latest": {},
            "name": "",
            "request": {},
            "selector": ".foo-selector",
            "updated_at": mock.ANY,
            "url": "",
        }

    def test_list(self, client, staff_session):
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
                    "id": watcher.id,
                    "is_active": True,
                    "latest": {},
                    "name": "",
                    "request": {},
                    "selector": ".foo-selector",
                    "updated_at": mock.ANY,
                    "url": "",
                }
            ],
        }
