from django.contrib.postgres.search import SearchVector
from django.http import JsonResponse
from mainframe.clients.logs import get_default_logger
from mainframe.clients.system import run_cmd
from mainframe.devices.models import Device
from mainframe.devices.serializers import DeviceSerializer
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser

logger = get_default_logger(__name__)


def add_zeros_to_mac(mac):
    components = [f"0{m}" if len(m) < 2 else m for m in mac.split(":")]  # noqa: PLR2004
    return ":".join(components)


class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.order_by("-is_active", "name", "ip")
    serializer_class = DeviceSerializer
    permission_classes = (IsAdminUser,)

    def get_queryset(self):  # noqa: C901
        queryset = super().get_queryset()
        params = self.request.query_params
        if search_term := params.get("search"):
            queryset = queryset.annotate(
                search=SearchVector("ip", "mac", "name"),
            ).filter(search__icontains=search_term)
        return queryset

    @action(detail=False, methods=["put"])
    def sync(self, request, **kwargs):
        output = run_cmd("arp -a")
        items = []
        for item in output.split("\n"):
            if not item.strip():
                continue
            _, ip, __, mac, *___ = item.split()
            items.append(
                Device(
                    ip=ip[1:-1],
                    mac=(
                        add_zeros_to_mac(mac)
                        if "incomplete" not in mac
                        else f"E: {ip[1:-1]}"
                    ),
                    is_active=True,
                )
            )
        if items:
            Device.objects.update(is_active=False)
            logger.info("Creating %d", len(items))
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
