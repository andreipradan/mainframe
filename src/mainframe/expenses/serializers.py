from mainframe.api.user.serializers import UserSerializer
from mainframe.expenses.models import Car, Debt, Expense, ExpenseGroup, ServiceEntry
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


class ServiceEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceEntry
        fields = "__all__"


class CarSerializer(serializers.ModelSerializer):
    service_entries = ServiceEntrySerializer(many=True, read_only=True)

    class Meta:
        depth = 1
        fields = "__all__"
        model = Car
