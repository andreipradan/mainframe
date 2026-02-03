import pytest
from rest_framework.exceptions import AuthenticationFailed

from mainframe.api.authentication.models import ActiveSession
from mainframe.api.authentication.serializers import (
    LoginSerializer,
    RegisterSerializer,
    _generate_jwt_token,
)
from mainframe.api.user.models import User
from tests.factories.user import UserFactory


@pytest.mark.django_db
class TestAuthenticationSerializers:
    def test_generate_jwt_token(self):
        user = UserFactory(email="test@example.com")
        token = _generate_jwt_token(user)
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_login_serializer_valid(self):
        credentials = {"email": "test@example.com", "password": "password"}
        UserFactory(**credentials, is_active=True)

        serializer = LoginSerializer(data=credentials)
        assert serializer.is_valid(), serializer.errors

        assert "token" in serializer.validated_data
        assert "user" in serializer.validated_data
        assert serializer.validated_data["user"]["email"] == "test@example.com"

    def test_login_serializer_missing_email(self):
        serializer = LoginSerializer(data={"password": "password"})
        assert not serializer.is_valid()
        assert serializer.errors == {"email": ["This field is required."]}

    def test_login_serializer_missing_password(self):
        serializer = LoginSerializer(data={"email": "test@example.com"})
        assert not serializer.is_valid()
        assert serializer.errors == {"password": ["This field is required."]}

    def test_login_serializer_wrong_credentials(self):
        """Test login serializer with wrong password"""
        UserFactory(
            email="test@example.com",
            password="secure_pass_123",  # noqa: S106
            is_active=True,
        )

        data = {"email": "test@example.com", "password": "wrong_password"}
        serializer = LoginSerializer(data=data)
        with pytest.raises(AuthenticationFailed) as exc:
            serializer.is_valid(raise_exception=True)
        assert "Wrong credentials" in str(exc.value)

    def test_login_serializer_inactive_user(self):
        UserFactory(
            email="test@example.com",
            password="password",  # noqa: S106
            is_active=False,
        )

        data = {"email": "test@example.com", "password": "password"}
        serializer = LoginSerializer(data=data)
        with pytest.raises(AuthenticationFailed) as exc:
            serializer.is_valid(raise_exception=True)
        assert "not active" in str(exc.value)

    def test_login_serializer_nonexistent_user(self):
        data = {"email": "nonexistent@example.com", "password": "password"}

        serializer = LoginSerializer(data=data)
        with pytest.raises(AuthenticationFailed) as exc:
            serializer.is_valid(raise_exception=True)
        assert "Wrong credentials" in str(exc.value)

    def test_login_creates_active_session(self):
        credentials = {"email": "test@example.com", "password": "password"}
        user = UserFactory(**credentials, is_active=True)
        initial_sessions = ActiveSession.objects.filter(user=user).count()

        serializer = LoginSerializer(data=credentials)
        assert serializer.is_valid()
        sessions = ActiveSession.objects.filter(user=user)
        assert sessions.count() == initial_sessions + 1

    def test_register_serializer_valid(self):
        data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "secure_password_123",
            "is_active": True,
        }

        serializer = RegisterSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_register_serializer_missing_email(self):
        data = {
            "username": "testuser",
            "password": "secure_password",
        }

        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert serializer.errors == {"email": ["This field is required."]}

    def test_register_serializer_missing_password(self):
        data = {
            "username": "testuser",
            "email": "test@example.com",
        }

        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert serializer.errors == {"password": ["This field is required."]}

    def test_register_serializer_short_password(self):
        data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "123",
        }

        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert serializer.errors == {
            "password": ["Ensure this field has at least 4 characters."]
        }

    def test_register_serializer_duplicate_email(self):
        UserFactory(email="test@example.com")

        data = {
            "username": "newuser",
            "email": "test@example.com",
            "password": "password123",
        }

        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert serializer.errors == {"email": ["Email already taken."]}

    def test_register_serializer_creates_user(self):
        data = {
            "username": "newuser",
            "email": "new@example.com",
            "password": "password123",
        }

        serializer = RegisterSerializer(data=data)
        assert serializer.is_valid()
        user = serializer.save()

        assert user.email == "new@example.com"
        assert user.username == "new"
        assert User.objects.filter(email="new@example.com").exists()

    def test_register_serializer_password_hashed(self):
        data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "myplainpassword123",
        }

        serializer = RegisterSerializer(data=data)
        assert serializer.is_valid()
        user = serializer.save()

        # Password should be hashed, not plain text
        plain_password = "myplainpassword123"  # noqa: S105
        assert user.password != plain_password
        assert user.check_password(plain_password)

    def test_login_serializer_token_validity(self):
        import jwt
        from django.conf import settings

        credentials = {"email": "test@example.com", "password": "password"}
        user = UserFactory(**credentials, is_active=True)

        serializer = LoginSerializer(data=credentials)
        assert serializer.is_valid()

        token = serializer.validated_data["token"]
        # Token should be decodable
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert decoded["id"] == user.id

    def test_login_serializer_session_cleanup(self):
        credentials = {"email": "test@example.com", "password": "password"}
        user = UserFactory(**credentials, is_active=True)

        # Create first session
        serializer1 = LoginSerializer(data=credentials)
        assert serializer1.is_valid()
        _ = serializer1.validated_data["token"]

        # Create second session - should replace or manage the first
        serializer2 = LoginSerializer(data=credentials)
        assert serializer2.is_valid()
        _ = serializer2.validated_data["token"]

        # Both should be valid for the user
        sessions = ActiveSession.objects.filter(user=user)
        assert sessions.count() >= 1
