import json
from unittest import mock

import pytest
from django.urls import reverse
from rest_framework import status

from tests.api.factories import UserFactory


@pytest.mark.django_db
class TestUserViewSet:
    def test_detail(self, client, session):
        url = reverse("api:users-detail", kwargs={"pk": session.user_id})
        response = client.get(url, HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.json() == {
            "date": mock.ANY,
            "email": "foo@bar.com",
            "groups": [],
            "id": session.user_id,
            "is_active": True,
            "is_staff": True,
            "last_login": None,
            "username": "foo@bar.com",
        }

    def test_edit(self, client, session):
        user = UserFactory(is_active=False)
        url = reverse("api:users-detail", kwargs={"pk": user.id})
        response = client.patch(
            url,
            data=json.dumps({"is_active": True}),
            HTTP_AUTHORIZATION=session.token,
            content_type="application/json",
        )
        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.json()["is_active"]

    def test_list(self, client, db, session):
        user = UserFactory(is_active=False)
        response = client.get(
            reverse("api:users-list"),
            HTTP_AUTHORIZATION=session.token,
        )
        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.json() == {
            "count": 2,
            "next": None,
            "previous": None,
            "results": [
                {
                    "date": mock.ANY,
                    "email": "foo@bar.com",
                    "groups": [],
                    "id": session.user_id,
                    "is_active": True,
                    "is_staff": True,
                    "last_login": None,
                    "username": "foo@bar.com",
                },
                {
                    "date": mock.ANY,
                    "email": "",
                    "groups": [],
                    "id": user.id,
                    "is_active": False,
                    "is_staff": False,
                    "last_login": None,
                    "username": "",
                },
            ],
        }
