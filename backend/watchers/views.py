import logging

from rest_framework import viewsets
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
