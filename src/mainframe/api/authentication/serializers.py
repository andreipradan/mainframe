from datetime import datetime, timedelta

import jwt
from django.conf import settings
from django.contrib.auth import authenticate
from django.core.exceptions import ObjectDoesNotExist
from jwt import InvalidSignatureError
from mainframe.api.authentication.models import ActiveSession
from mainframe.api.user.models import User
from mainframe.api.user.serializers import UserSerializer
from rest_framework import exceptions, serializers


def _generate_jwt_token(user):
    payload = {"id": user.pk, "exp": datetime.utcnow() + timedelta(days=7)}
    token = jwt.encode(payload, settings.SECRET_KEY)
    return token


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(max_length=255)
    password = serializers.CharField(max_length=128, write_only=True)

    def validate(self, data):
        email = data.get("email", None)
        password = data.get("password", None)

        if email is None:
            raise exceptions.ValidationError("Email is required to login")
        if password is None:
            raise exceptions.ValidationError("Password is required to log in.")
        user = authenticate(username=email, password=password)

        if user is None:
            raise exceptions.AuthenticationFailed("Wrong credentials")

        if not user.is_active:
            error = (
                "Your account is not active, please refer to a member "
                "of the staff to update your account"
            )
            raise exceptions.AuthenticationFailed(error)

        try:
            session = ActiveSession.objects.get(user=user)
            if not session.token:
                raise ValueError

            jwt.decode(session.token, settings.SECRET_KEY, algorithms=["HS256"])
        except (ActiveSession.MultipleObjectsReturned, InvalidSignatureError):
            ActiveSession.objects.filter(user=user).delete()
            session = ActiveSession.objects.create(
                user=user, token=_generate_jwt_token(user)
            )
        except (ObjectDoesNotExist, ValueError, jwt.ExpiredSignatureError):
            session = ActiveSession.objects.create(
                user=user, token=_generate_jwt_token(user)
            )

        return {"token": session.token, "user": UserSerializer(user).data}


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(min_length=4, max_length=128, write_only=True)

    class Meta:
        model = User
        fields = ["id", "password", "email", "is_active", "date"]

    @staticmethod
    def validate_email(value):
        try:
            User.objects.get(email=value)
        except ObjectDoesNotExist:
            return value
        raise exceptions.ValidationError("Email already taken.")

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["email"].split("@")[0],
            **validated_data,
        )
