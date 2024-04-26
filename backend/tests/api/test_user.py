import json
from unittest import mock

import pytest
from rest_framework import status

from api.user.models import User
from tests.api.factories import UserFactory


@pytest.mark.django_db
class TestUserViewSet:
    def test_delete_as_staff(self, client, staff_session):
        user = UserFactory(is_active=False)
        response = client.delete(
            f"/api/users/{user.id}",
            HTTP_AUTHORIZATION=staff_session.token,
            content_type="application/json",
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT, response.data
        assert response.data is None
        assert not User.objects.filter(id=user.id).exists()

    def test_delete_forbidden(self, client, session):
        user = UserFactory(is_active=False)
        response = client.delete(
            f"/api/users/{user.id}",
            HTTP_AUTHORIZATION=session.token,
            content_type="application/json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN, response.data

    def test_detail_as_staff(self, client, staff_session):
        url = f"/api/users/{staff_session.user_id}"
        response = client.get(url, HTTP_AUTHORIZATION=staff_session.token)
        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.json() == {
            "date": mock.ANY,
            "email": "foo@bar.com",
            "id": staff_session.user_id,
            "is_active": True,
            "is_staff": True,
            "last_login": None,
            "username": "foo@bar.com",
        }

    def test_detail_forbidden(self, client, session):
        url = f"/api/users/{session.user_id}"
        response = client.get(url, HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_403_FORBIDDEN, response.data

    def test_edit_as_staff(self, client, staff_session):
        user = UserFactory(is_active=False)
        url = f"/api/users/{user.id}"
        response = client.patch(
            url,
            data=json.dumps({"is_active": True}),
            HTTP_AUTHORIZATION=staff_session.token,
            content_type="application/json",
        )
        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.json()["is_active"]

    def test_edit_forbidden(self, client, session):
        user = UserFactory(is_active=False)
        url = f"/api/users/{user.id}"
        response = client.patch(
            url,
            data=json.dumps({"is_active": True}),
            HTTP_AUTHORIZATION=session.token,
            content_type="application/json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN, response.data

    def test_list_as_staff(self, client, staff_session):
        user = UserFactory(is_active=False)
        response = client.get("/api/users/", HTTP_AUTHORIZATION=staff_session.token)
        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.json() == {
            "count": 2,
            "next": None,
            "previous": None,
            "results": [
                {
                    "date": mock.ANY,
                    "email": "foo@bar.com",
                    "id": staff_session.user_id,
                    "is_active": True,
                    "is_staff": True,
                    "last_login": None,
                    "username": "foo@bar.com",
                },
                {
                    "date": mock.ANY,
                    "email": user.email,
                    "id": user.id,
                    "is_active": False,
                    "is_staff": False,
                    "last_login": None,
                    "username": user.username,
                },
            ],
        }

    def test_list_forbidden(self, client, session):
        UserFactory(is_active=False)
        response = client.get("/api/users/", HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_403_FORBIDDEN, response.data
