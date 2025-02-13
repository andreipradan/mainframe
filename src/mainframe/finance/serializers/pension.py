from rest_framework import serializers

from mainframe.finance.models import Contribution, Pension, UnitValue


class ContributionSerializer(serializers.ModelSerializer):
    unit_value = serializers.CharField(read_only=True)

    class Meta:
        model = Contribution
        fields = "__all__"


class PensionUnitValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitValue
        fields = ("date", "value")


class PensionSerializer(serializers.ModelSerializer):
    contributions = ContributionSerializer(many=True, read_only=True)
    latest_unit_value = serializers.CharField()
    latest_unit_value_date = serializers.CharField()

    class Meta:
        depth = 1
        fields = "__all__"
        model = Pension
