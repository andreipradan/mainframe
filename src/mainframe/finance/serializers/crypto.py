from rest_framework import serializers

from mainframe.finance.models import CryptoPnL, CryptoTransaction


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
