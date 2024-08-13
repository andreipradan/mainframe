from django.contrib.postgres.search import SearchVector
from django.http import JsonResponse
from mainframe.clients.devices import DevicesClient, DevicesException
from mainframe.clients.logs import get_default_logger
from mainframe.devices.models import Device
from mainframe.devices.serializers import DeviceSerializer
from mainframe.sources.models import Source
from rest_framework import status, viewsets
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
        client = DevicesClient(Source.objects.default())
        try:
            client.run()
        except DevicesException as ex:
            logger.exception(ex)
            return JsonResponse({"error": str(ex)}, status=status.HTTP_400_BAD_REQUEST)
        return super().list(request, **kwargs)
