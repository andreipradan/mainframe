from rest_framework import serializers

from finance.models import (
    Account,
    Category,
    Credit,
    Payment,
    Timetable,
    Transaction,
    ExchangeRate,
)


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


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

    verbose = serializers.ReadOnlyField()


class CreditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Credit
        fields = "__all__"


class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = "__all__"


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"


class TimetableSerializer(serializers.ModelSerializer):
    interest = serializers.ReadOnlyField()
    number_of_months = serializers.ReadOnlyField()

    class Meta:
        depth = 1
        fields = "__all__"
        model = Timetable


class TransactionSerializer(serializers.ModelSerializer):
    account_name = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = "__all__"

    @staticmethod
    def get_account_name(obj):
        account = AccountSerializer(obj.account).data
        return f"{account['bank']} | {account['type']}"
