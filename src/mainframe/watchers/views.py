import logging

from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser

from mainframe.watchers.models import Watcher, WatcherError
from mainframe.watchers.serializers import WatcherSerializer

logger = logging.getLogger(__name__)


class WatcherViewSet(viewsets.ModelViewSet):
    queryset = Watcher.objects.order_by("-is_active", "name")
    serializer_class = WatcherSerializer
    permission_classes = (IsAdminUser,)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data["types"] = Watcher.TYPE_CHOICES
        return response

    @action(detail=True, methods=["PUT"])
    def run(self, request, pk=None):
        obj: Watcher = self.get_object()
        try:
            obj = obj.run(is_manual=True)
        except WatcherError as e:
            raise ValidationError(str(e)) from ValueError
        if not obj:
            return JsonResponse({})
        return JsonResponse(self.serializer_class(obj).data)

    @action(detail=False, methods=["PUT"])
    def test(self, request):
        watcher = Watcher(**request.data)
        try:
            return JsonResponse({"results": watcher.fetch(logger)})
        except WatcherError as e:
            logger.error(e)
            raise ValidationError(e) from e
