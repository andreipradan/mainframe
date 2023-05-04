import logging

from rest_framework import serializers
from devices.models import Device

logger = logging.getLogger(__name__)


class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = "__all__"
