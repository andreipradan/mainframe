import logging

from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser

from mainframe.watchers.models import Watcher, WatcherError, fetch_element
from mainframe.watchers.serializers import WatcherSerializer

logger = logging.getLogger(__name__)


class WatcherViewSet(viewsets.ModelViewSet):
    queryset = Watcher.objects.order_by("-is_active", "name")
    serializer_class = WatcherSerializer
    permission_classes = (IsAdminUser,)

    @action(detail=True, methods=["PUT"])
    def run(self, request, pk=None):
        obj = self.get_object()
        try:
            obj = obj.run()
        except WatcherError as e:
            raise ValidationError(str(e)) from ValueError
        return JsonResponse(self.serializer_class(obj).data if obj else obj, safe=False)

    @action(detail=False, methods=["PUT"])
    def test(self, request):
        watcher = Watcher(**request.data)
        try:
            element = fetch_element(watcher, logger)
        except WatcherError as e:
            logger.error(e)
            raise ValidationError(e) from e

        data = {"result": str(element)}
        if watcher.latest.get("title") == (
            element.text.strip() or element.attrs.get("title")
        ):
            data["is_new"] = False
        return JsonResponse(data)
