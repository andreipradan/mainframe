from mainframe.finance.models import (
    Account,
    Category,
    Contribution,
    Credit,
    CryptoPnL,
    CryptoTransaction,
    Payment,
    Pension,
    PnL,
    StockTransaction,
    Timetable,
    Transaction,
    UnitValue,
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


class CryptoPnLSerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = CryptoPnL


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


class ContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contribution
        fields = "__all__"

    def create(self, validated_data):
        date = validated_data["date"]
        if not validated_data.get("units"):
            unit_value = (
                validated_data["pension"]
                .unitvalue_set.filter(
                    date__month=date.month,
                    date__year=date.year,
                )
                .order_by("date")
                .first()
            )
            if not unit_value:
                raise serializers.ValidationError(
                    f"No unitValue found for '{date.month}/{date.year}'"
                )

            validated_data["units"] = validated_data["amount"] / unit_value.value
        return super().create(validated_data)


class PensionUnitValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitValue
        fields = "__all__"


class PensionSerializer(serializers.ModelSerializer):
    contributions = ContributionSerializer(
        many=True, source="contribution_set", read_only=True
    )
    unit_values = PensionUnitValueSerializer(
        many=True, source="unitvalue_set", read_only=True
    )

    class Meta:
        depth = 1
        fields = "__all__"
        model = Pension


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
