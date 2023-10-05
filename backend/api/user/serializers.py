from rest_framework import serializers

from api.user.models import User


class UserSerializer(serializers.ModelSerializer):
    date = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "date"]
        read_only_field = ["id"]
