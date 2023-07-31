from rest_framework import serializers

from credit.models import Timetable, Payment, Credit


class CreditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Credit
        fields = "__all__"


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"


class TimetableSerializer(serializers.ModelSerializer):
    interest = serializers.ReadOnlyField()
    number_of_months = serializers.ReadOnlyField()

    class Meta:
        model = Timetable
        fields = "__all__"
