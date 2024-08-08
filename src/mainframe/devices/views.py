from django.contrib.postgres.search import SearchVector
from mainframe.clients.logs import get_default_logger
from mainframe.clients.system import fetch_network_devices
from mainframe.devices.models import Device
from mainframe.devices.serializers import DeviceSerializer
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser

logger = get_default_logger(__name__)


class DevicePagination(PageNumberPagination):
    page_size = 300


class DeviceViewSet(viewsets.ModelViewSet):
    pagination_class = DevicePagination
    permission_classes = (IsAdminUser,)
    queryset = Device.objects.order_by("-is_active", "name", "ip")
    serializer_class = DeviceSerializer

    def get_queryset(self):  # noqa: C901
        queryset = super().get_queryset()
        params = self.request.query_params
        if search_term := params.get("search"):
            queryset = queryset.annotate(
                search=SearchVector("ip", "mac", "name"),
            ).filter(search__icontains=search_term)
        return queryset.order_by("-is_active", "name", "mac")

    @action(detail=False, methods=["put"])
    def sync(self, request, **kwargs):
        if devices := fetch_network_devices():
            Device.objects.update(is_active=False)
            logger.info("Creating %d", len(devices))
            Device.objects.bulk_create(
                [Device(**d) for d in devices],
                update_conflicts=True,
                update_fields=["is_active", "ip"],
                unique_fields=["mac"],
            )
        return super().list(request, **kwargs)
