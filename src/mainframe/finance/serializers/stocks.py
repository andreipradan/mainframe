from mainframe.finance.models import PnL, StockTransaction
from rest_framework import serializers


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
