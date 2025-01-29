from rest_framework import serializers

from mainframe.finance.models import Contribution, Pension, UnitValue


class ContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contribution
        fields = "__all__"

    def create(self, validated_data):
        date = validated_data["date"]
        if not validated_data.get("units"):
            unit_value = (
                validated_data["pension"]
                .unitvalue_set.filter(
                    date__month=date.month,
                    date__year=date.year,
                )
                .order_by("date")
                .first()
            )
            if not unit_value:
                raise serializers.ValidationError(
                    f"No unitValue found for '{date.month}/{date.year}'"
                )

            validated_data["units"] = validated_data["amount"] / unit_value.value
        return super().create(validated_data)


class PensionUnitValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitValue
        fields = "__all__"


class PensionSerializer(serializers.ModelSerializer):
    contributions = ContributionSerializer(
        many=True, source="contribution_set", read_only=True
    )
    unit_values = PensionUnitValueSerializer(
        many=True, source="unitvalue_set", read_only=True
    )

    class Meta:
        depth = 1
        fields = "__all__"
        model = Pension
