from mainframe.exchange.models import ExchangeRate
from rest_framework import serializers


class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = "__all__"
