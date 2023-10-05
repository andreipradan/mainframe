from datetime import datetime, timedelta

import jwt
from django.conf import settings
from django.contrib.auth import authenticate
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import exceptions, serializers

from api.authentication.models import ActiveSession
from api.user.models import User


def _generate_jwt_token(user):
    payload = {"id": user.pk, "exp": datetime.utcnow() + timedelta(days=7)}
    token = jwt.encode(payload, settings.SECRET_KEY)
    return token


def get_error(msg):
    return {"success": False, "msg": msg}


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(max_length=255)
    password = serializers.CharField(max_length=128, write_only=True)

    @staticmethod
    def validate(data):
        email = data.get("email", None)
        password = data.get("password", None)

        if email is None:
            error = get_error(get_error("Email is required to login"))
            raise exceptions.ValidationError(error)
        if password is None:
            error = get_error("Password is required to log in.")
            raise exceptions.ValidationError(error)
        user = authenticate(username=email, password=password)

        if user is None:
            raise exceptions.AuthenticationFailed(get_error("Wrong credentials"))

        if not user.is_active:
            raise exceptions.ValidationError(get_error("User is not active"))

        try:
            session = ActiveSession.objects.get(user=user)
            if not session.token:
                raise ValueError

            jwt.decode(session.token, settings.SECRET_KEY, algorithms=["HS256"])
        except ActiveSession.MultipleObjectsReturned:
            ActiveSession.objects.filter(user=user).delete()
            session = ActiveSession.objects.create(
                user=user, token=_generate_jwt_token(user)
            )
        except (ObjectDoesNotExist, ValueError, jwt.ExpiredSignatureError):
            session = ActiveSession.objects.create(
                user=user, token=_generate_jwt_token(user)
            )

        return {
            "success": True,
            "token": session.token,
            "user": {
                "id": user.pk,
                "email": user.email,
                "joined_date": user.date,
                "last_login": session.date,
                "name": user.name,
            },
        }


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(min_length=4, max_length=128, write_only=True)
    username = serializers.CharField(max_length=255, required=True)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ["id", "username", "password", "email", "is_active", "date"]

    @staticmethod
    def validate_username(value):
        try:
            User.objects.get(username=value)
        except ObjectDoesNotExist:
            return value
        raise exceptions.ValidationError(get_error("Username already taken."))

    @staticmethod
    def validate_email(value):
        try:
            User.objects.get(email=value)
        except ObjectDoesNotExist:
            return value
        raise exceptions.ValidationError(get_error("Email already taken."))

    @staticmethod
    def create(validated_data):
        return User.objects.create_user(**validated_data)
