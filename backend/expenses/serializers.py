from rest_framework import serializers

from api.user.serializers import UserSerializer
from expenses.models import ExpenseGroup


class ExpenseGroupSerializer(serializers.ModelSerializer):
    users = UserSerializer(many=True, read_only=True)

    class Meta:
        model = ExpenseGroup
        fields = "__all__"
