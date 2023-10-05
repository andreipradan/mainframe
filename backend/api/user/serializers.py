from rest_framework import serializers

from api.user.models import User


class UserSerializer(serializers.ModelSerializer):
    date = serializers.DateTimeField(read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "date",
            "email",
            "groups",
            "is_active",
            "is_staff",
            "last_login",
            "name",
            "username",
        ]
        read_only_field = ["id"]

    @staticmethod
    def get_name(obj):
        return obj.name
