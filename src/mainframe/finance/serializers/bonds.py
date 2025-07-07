from datetime import datetime

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
        if not obj.interest_dates:
            return 0
        today = datetime.today().date()
        future_dates = sorted([d for d in obj.interest_dates if d > today])
        if not future_dates:
            return 0
        diff = relativedelta(future_dates[0], obj.date.date())
        return diff.years * 12 + diff.months
