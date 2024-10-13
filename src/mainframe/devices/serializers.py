from django.db.utils import IntegrityError
from mainframe.devices.models import Device
from rest_framework import serializers
from rest_framework.exceptions import ValidationError


class DeviceSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="__repr__", read_only=True)

    class Meta:
        model = Device
        fields = "__all__"

    def save(self, **kwargs):
        try:
            return super().save(**kwargs)
        except IntegrityError as e:
            raise ValidationError({"detail": str(e)}) from e
