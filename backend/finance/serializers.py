from rest_framework import serializers

from finance.models import Timetable, Payment, Credit, Account, Transaction


class AccountSerializer(serializers.ModelSerializer):
    transaction_count = serializers.ReadOnlyField()

    class Meta:
        model = Account
        fields = (
            "bank",
            "client_code",
            "created_at",
            "currency",
            "first_name",
            "id",
            "last_name",
            "number",
            "transaction_count",
            "type",
            "updated_at",
        )


class CreditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Credit
        fields = "__all__"


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"


class TimetableSerializer(serializers.ModelSerializer):
    interest = serializers.ReadOnlyField()
    number_of_months = serializers.ReadOnlyField()

    class Meta:
        model = Timetable
        fields = "__all__"


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = "__all__"
