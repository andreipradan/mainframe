import logging

from django.core.exceptions import BadRequest
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser

from clients.logs import MainframeHandler
from watchers.models import Watcher
from watchers.serializers import WatcherSerializer

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


class WatcherViewSet(viewsets.ModelViewSet):
    queryset = Watcher.objects.order_by("-is_active", "name")
    serializer_class = WatcherSerializer
    permission_classes = (IsAdminUser,)

    @action(detail=True, methods=["PUT"])
    def run(self, request, pk=None):
        obj = self.get_object()
        result = obj.run()
        if isinstance(result, str):
            raise BadRequest(result)
        return JsonResponse({"result": result})
