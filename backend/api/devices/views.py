import logging

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from api.devices.serializers import DeviceSerializer
from api.hooks.github import run_cmd
from devices.models import Device

logger = logging.getLogger(__name__)


class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.order_by("name", "ip")
    serializer_class = DeviceSerializer
    permission_classes = (IsAuthenticated,)

    @action(detail=False, methods=["put"])
    def sync(self, request, **kwargs):
        output = run_cmd("arp -a")
        items = []
        for item in output.split("\n"):
            if not item.strip():
                continue
            _, ip, __, mac, *junk = item.split()
            items.append(Device(ip=ip[1:-1], mac=mac))
        if items:
            logger.info(f"Creating {len(items)}")
            Device.objects.bulk_create(items, ignore_conflicts=True)
        return super().list(request, **kwargs)
