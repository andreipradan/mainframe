from mainframe.api.user.serializers import UserSerializer
from mainframe.expenses.models import Debt, Expense, ExpenseGroup
from rest_framework import serializers


class DebtSerializer(serializers.ModelSerializer):
    class Meta:
        model = Debt
        fields = "__all__"


class ExpenseSerializer(serializers.ModelSerializer):
    debts = DebtSerializer(many=True, read_only=True)
    payer = UserSerializer(read_only=True)
    payer_id = serializers.IntegerField()

    class Meta:
        fields = "__all__"
        model = Expense


class ExpenseGroupSerializer(serializers.ModelSerializer):
    users = UserSerializer(many=True, read_only=True)

    class Meta:
        model = ExpenseGroup
        fields = "__all__"
