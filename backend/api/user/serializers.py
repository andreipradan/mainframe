from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from api.user.models import User


class UserSerializer(serializers.ModelSerializer):
    date = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "date",
            "email",
            "is_active",
            "is_staff",
            "last_login",
            "username",
        ]
        read_only_field = ["id"]


class ChangePasswordSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)
    old_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ("old_password", "password", "password2")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            error = {"password": "Password fields didn't match."}
            raise serializers.ValidationError(error)
        if attrs["old_password"] == attrs["password"]:
            error = {"password": "Password must be different than old password"}
            raise serializers.ValidationError(error)
        return attrs

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            error = {"old_password": "Old password is not correct"}
            raise serializers.ValidationError(error)
        return value

    def update(self, instance, validated_data):
        instance.set_password(validated_data["password"])
        instance.save()
        return instance
