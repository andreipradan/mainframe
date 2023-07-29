from rest_framework import serializers

from credit.models import Timetable, Payment, Credit


class CreditSerializer(serializers.ModelSerializer):
    latest_timetable = serializers.SerializerMethodField()

    class Meta:
        model = Credit
        fields = "__all__"

    def get_latest_timetable(self, obj):
        return TimetableSerializer(obj.latest_timetable).data


class PaymentSerializer(serializers.ModelSerializer):
    credit = CreditSerializer(many=False)

    class Meta:
        model = Payment
        fields = "__all__"


class TimetableSerializer(serializers.ModelSerializer):
    interest = serializers.ReadOnlyField()
    number_of_months = serializers.ReadOnlyField()

    class Meta:
        model = Timetable
        fields = "__all__"
