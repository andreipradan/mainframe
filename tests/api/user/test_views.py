import json
from unittest import mock

import pytest
from jwt.exceptions import ExpiredSignatureError
from rest_framework import status

from mainframe.api.authentication.serializers import _generate_jwt_token
from mainframe.api.user.models import User
from tests.factories.user import UserFactory


@pytest.mark.django_db
class TestLogin:
    def test_success(self, client):
        credentials = {"email": "test@example.com", "password": "password"}
        user = UserFactory(**credentials, is_active=True)

        response = client.post("/users/login", data=credentials)

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
        response = client.post("/users/login", data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {"email": ["This field is required."]}

    def test_missing_password(self, client):
        data = {"email": "test@example.com"}
        response = client.post("/users/login", data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {"password": ["This field is required."]}

    def test_wrong_credentials(self, client):
        data = {"email": "test@example.com", "password": "wrongpassword"}
        response = client.post("/users/login", data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == {"detail": "Wrong credentials"}

    def test_inactive_user(self, client):
        credentials = {"email": "test@example.com", "password": "password"}
        UserFactory(**credentials, is_active=False)

        response = client.post("/users/login", data=credentials)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == {
            "detail": "Your account is not active, please refer to "
            "a member of the staff to update your account"
        }

    @mock.patch("mainframe.api.authentication.backends.jwt.decode")
    def test_expired_signature(self, decode_mock, client, session):
        decode_mock.side_effect = ExpiredSignatureError
        response = client.get(
            f"/users/{session.user_id}", HTTP_AUTHORIZATION=session.token
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_no_session(self, client):
        token = _generate_jwt_token(UserFactory())
        response = client.get("/users/foo", HTTP_AUTHORIZATION=token)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_register(self, client, session):
        data = {
            "username": "test",
            "password": "pass",
            "email": "test@appseed.us",
            "name": "test",
        }

        response = client.post("/users/register", data=data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json() == {"msg": "You were successfully registered 🎉"}

    def test_register_with_existing_email(self, client, session):
        UserFactory(email="test@example.com")
        data = {
            "username": "test",
            "password": "pass",
            "email": "test@example.com",
            "name": "test",
        }

        response = client.post("/users/register", data=data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"email": ["Email already taken."]}

    def test_logout(self, client, session):
        response = client.put("/users/logout", HTTP_AUTHORIZATION=session.token)

        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.json() == {"msg": "Token revoked"}

    def test_delete_as_staff(self, client, staff_session):
        user = UserFactory(is_active=False)
        response = client.delete(
            f"/users/{user.id}",
            HTTP_AUTHORIZATION=staff_session.token,
            content_type="application/json",
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT, response.data
        assert response.data is None
        assert not User.objects.filter(id=user.id).exists()

    def test_delete_forbidden(self, client, session):
        user = UserFactory(is_active=False)
        response = client.delete(
            f"/users/{user.id}",
            HTTP_AUTHORIZATION=session.token,
            content_type="application/json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN, response.data
        assert response.data == {
            "detail": "You do not have permission to perform this action."
        }

    def test_detail_as_staff(self, client, staff_session):
        url = f"/users/{staff_session.user_id}"
        response = client.get(url, HTTP_AUTHORIZATION=staff_session.token)
        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.json() == {
            "date": mock.ANY,
            "email": "staff@bar.com",
            "id": staff_session.user_id,
            "is_active": True,
            "is_staff": True,
            "last_login": None,
            "username": "staff",
        }

    def test_detail_forbidden(self, client, session):
        url = f"/users/{session.user_id}"
        response = client.get(url, HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_403_FORBIDDEN, response.data
        assert response.data == {
            "detail": "You do not have permission to perform this action."
        }

    def test_edit_as_staff(self, client, staff_session):
        user = UserFactory(is_active=False)
        url = f"/users/{user.id}"
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
        url = f"/users/{user.id}"
        response = client.patch(
            url,
            data=json.dumps({"is_active": True}),
            HTTP_AUTHORIZATION=session.token,
            content_type="application/json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN, response.data
        assert response.data == {
            "detail": "You do not have permission to perform this action."
        }

    def test_list_as_staff(self, client, staff_session):
        user = UserFactory(is_active=False)
        response = client.get("/users/", HTTP_AUTHORIZATION=staff_session.token)
        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.json() == {
            "count": 2,
            "next": None,
            "page_size": 25,
            "previous": None,
            "results": [
                {
                    "date": mock.ANY,
                    "email": "staff@bar.com",
                    "id": staff_session.user_id,
                    "is_active": True,
                    "is_staff": True,
                    "last_login": None,
                    "username": "staff",
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
        response = client.get("/users/", HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_403_FORBIDDEN, response.data
        assert response.data == {
            "detail": "You do not have permission to perform this action."
        }

    def test_forbidden_with_no_session_user(self, client, session):
        with mock.patch(
            "mainframe.api.authentication.backends.ActiveSession.objects.get",
        ) as session_mock:
            type(session_mock.return_value).user = mock.PropertyMock(
                side_effect=User.DoesNotExist
            )
            response = client.get("/users/", HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == {
            "msg": "No user matching this token was found.",
            "success": "False",
        }

    def test_forbidden_with_inactive_session_user(self, client, session):
        with mock.patch(
            "mainframe.api.authentication.backends.ActiveSession.objects.get",
        ) as session_mock:
            session_mock.return_value.user.is_active = False
            response = client.get("/users/", HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == {
            "msg": "This user has been deactivated.",
            "success": "False",
        }
