from mainframe.finance.models import (
    Account,
    Category,
    Credit,
    CryptoTransaction,
    Payment,
    PnL,
    StockTransaction,
    Timetable,
    Transaction,
)
from rest_framework import serializers


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


class CryptoTransactionSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()

    class Meta:
        fields = "__all__"
        model = CryptoTransaction

    @staticmethod
    def get_type(instance: CryptoTransaction):
        return instance.get_type_display()


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"


class PnLSerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = PnL


class StockTransactionSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()

    class Meta:
        fields = "__all__"
        model = StockTransaction

    @staticmethod
    def get_type(instance: StockTransaction):
        return instance.get_type_display()


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
