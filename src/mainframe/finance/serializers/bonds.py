from dateutil.relativedelta import relativedelta
from rest_framework import serializers

from mainframe.finance.models import Bond


class BondSerializer(serializers.ModelSerializer):
    months = serializers.SerializerMethodField()

    class Meta:
        fields = "__all__"
        model = Bond

    @staticmethod
    def get_months(obj: Bond):
        if not obj.maturity:
            return 0
        diff = relativedelta(obj.maturity, obj.date.date())
        return diff.years * 12 + diff.months
