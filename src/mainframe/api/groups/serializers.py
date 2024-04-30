from django.contrib.auth.models import Group
from mainframe.api.user.serializers import UserSerializer
from rest_framework import serializers


class GroupSerializer(serializers.ModelSerializer):
    users = UserSerializer(many=True, read_only=True, source="user_set")

    class Meta:
        fields = "id", "name", "users"
        model = Group
