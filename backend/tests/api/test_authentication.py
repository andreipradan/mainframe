from unittest import mock

import pytest
from rest_framework import status

from tests.api.factories import UserFactory


@pytest.mark.django_db
class TestLogin:
    def test_success(self, client):
        credentials = {"email": "test@example.com", "password": "password"}
        user = UserFactory(**credentials, is_active=True)

        response = client.post("/api/users/login", data=credentials)

        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.data == {
            "token": mock.ANY,
            "user": {
                "date": mock.ANY,
                "email": "test@example.com",
                "id": user.id,
                "is_active": True,
                "is_staff": False,
                "last_login": None,
                "username": user.username,
            },
        }

    def test_missing_email(self, client):
        data = {"password": "password123"}
        response = client.post("/api/users/login", data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {"email": ["This field is required."]}

    def test_missing_password(self, client):
        data = {"email": "test@example.com"}
        response = client.post("/api/users/login", data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {"password": ["This field is required."]}

    def test_wrong_credentials(self, client):
        data = {"email": "test@example.com", "password": "wrongpassword"}
        response = client.post("/api/users/login", data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == {"detail": "Wrong credentials"}


@pytest.mark.django_db
class TestAuthentication:
    def test_register(self, client, session):
        data = {
            "username": "test",
            "password": "pass",
            "email": "test@appseed.us",
            "name": "test",
        }

        response = client.post("/api/users/register", data=data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json() == {"msg": "You were successfully registered 🎉"}

    def test_logout(self, client, session):
        response = client.put("/api/users/logout", HTTP_AUTHORIZATION=session.token)

        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.json() == {"msg": "Token revoked"}
