from django.contrib.auth.models import Group
from rest_framework import serializers

from api.user.serializers import UserSerializer


class GroupSerializer(serializers.ModelSerializer):
    users = UserSerializer(many=True, read_only=True, source="user_set")

    class Meta:
        fields = "id", "name", "users"
        model = Group
