from rest_framework import serializers

from mainframe.finance.models import Deposit


class DepositSerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = Deposit
