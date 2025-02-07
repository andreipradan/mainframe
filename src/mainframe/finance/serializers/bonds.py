from rest_framework import serializers

from mainframe.finance.models import Bond


class BondSerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"
        model = Bond
