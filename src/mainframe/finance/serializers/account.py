from rest_framework import serializers

from mainframe.finance.models import Account


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
