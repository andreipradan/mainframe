import logging

from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser

from clients.logs import MainframeHandler
from watchers.models import Watcher
from watchers.serializers import WatcherSerializer

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


class WatcherViewSet(viewsets.ModelViewSet):
    queryset = Watcher.objects.order_by("cron", "name")
    serializer_class = WatcherSerializer
    permission_classes = (IsAdminUser,)

    @action(detail=True, methods=["PUT"])
    def run(self, request, pk=None):
        obj = self.get_object()
        try:
            result = obj.run()
        except ValueError as e:
            raise ValidationError(str(e)) from ValueError
        return JsonResponse({"result": result})
