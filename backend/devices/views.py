import logging

from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from clients.logs import MainframeHandler
from clients.os import run_cmd
from devices.models import Device
from devices.serializers import DeviceSerializer

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


def add_zeros_to_mac(mac):
    result = []
    for m in mac.split(":"):
        if len(m) < 2:
            m = f"0{m}"
        result.append(m)
    return ":".join(result)


class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.order_by("-is_active", "name", "ip")
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
            items.append(
                Device(
                    ip=ip[1:-1],
                    mac=add_zeros_to_mac(mac)
                    if "incomplete" not in mac
                    else f"E: {ip[1:-1]}",
                    is_active=True,
                )
            )
        if items:
            Device.objects.update(is_active=False)
            logger.info(f"Creating {len(items)}")
            Device.objects.bulk_create(
                items,
                update_conflicts=True,
                update_fields=["is_active", "ip"],
                unique_fields=["mac"],
            )
        return super().list(request, **kwargs)

    @action(detail=False, methods=["put"])
    def reboot(self, request, **kwargs):
        try:
            output = run_cmd("sudo reboot")
        except RuntimeError as e:
            return JsonResponse(data={"status": "400", "data": str(e)})

        return JsonResponse(data={"status": "200", "data": output})
