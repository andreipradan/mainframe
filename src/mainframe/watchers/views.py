from django.http import JsonResponse
from mainframe.clients.logs import get_default_logger
from mainframe.clients.scraper import fetch
from mainframe.watchers.models import Watcher, WatcherError
from mainframe.watchers.serializers import WatcherSerializer
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser

logger = get_default_logger(__name__)


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
        soup, error = fetch(
            request.data["url"], logger, timeout=10, headers={"User-Agent": "foo"}
        )
        if error:
            raise ValidationError(error)

        elements = soup.select(request.data["selector"])
        if not elements:
            raise ValidationError("No elements found")

        return JsonResponse({"result": str(elements[0])})
