from unittest import mock

import pytest
from django.urls import reverse
from rest_framework import status

from tests.api.factories import UserFactory


@pytest.mark.django_db
class TestLogin:
    url = reverse("api:login-list")

    def test_success(self, client):
        credentials = {"email": "test@example.com", "password": "password"}
        UserFactory(**credentials)

        response = client.post(self.url, data=credentials)

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "success": True,
            "token": mock.ANY,
            "user": {
                "email": "test@example.com",
                "id": 1,
                "joined_date": mock.ANY,
                "last_login": mock.ANY,
                "name": "test",
            },
        }

    def test_missing_email(self, client):
        data = {"password": "password123"}
        response = client.post(self.url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {"email": ["This field is required."]}

    def test_missing_password(self, client):
        data = {"email": "test@example.com"}
        response = client.post(self.url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {"password": ["This field is required."]}

    def test_wrong_credentials(self, client):
        data = {"email": "test@example.com", "password": "wrongpassword"}
        response = client.post(self.url, data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == {"msg": "Wrong credentials", "success": "False"}


@pytest.mark.django_db
class TestAuthentication:
    def test_register(self, client, session):
        data = {"username": "test", "password": "pass", "email": "test@appseed.us"}
        url = reverse("api:register-list")

        response = client.post(url, data=data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["success"] is True

    def test_logout(self, client, session):
        url = reverse("api:logout-list")

        response = client.post(url, HTTP_AUTHORIZATION=session.token)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["success"] is True

    def test_check_session(self, client, session):
        url = reverse("api:check-session-list")

        response = client.post(url, HTTP_AUTHORIZATION=session.token)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["success"] is True
