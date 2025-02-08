from dateutil.relativedelta import relativedelta
from rest_framework import serializers

from mainframe.finance.models import Deposit


class DepositSerializer(serializers.ModelSerializer):
    months = serializers.SerializerMethodField()

    class Meta:
        fields = "__all__"
        model = Deposit

    @staticmethod
    def get_months(obj: Deposit):
        diff = relativedelta(obj.maturity, obj.date)
        return diff.years * 12 + diff.months
