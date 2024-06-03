import requests
from bs4 import BeautifulSoup
from django.http import JsonResponse
from mainframe.clients.logs import get_default_logger
from mainframe.watchers.models import Watcher
from mainframe.watchers.serializers import WatcherSerializer
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser

logger = get_default_logger(__name__)


class WatcherViewSet(viewsets.ModelViewSet):
    queryset = Watcher.objects.order_by("cron", "name")
    serializer_class = WatcherSerializer
    permission_classes = (IsAdminUser,)

    @action(detail=True, methods=["PUT"])
    def run(self, request, pk=None):
        obj = self.get_object()
        try:
            obj.run()
        except ValueError as e:
            raise ValidationError(str(e)) from ValueError
        return JsonResponse(self.serializer_class(obj).data if obj else obj, safe=False)

    @action(detail=False, methods=["PUT"])
    def test(self, request):
        response = requests.get(
            request.data["url"], timeout=10, headers={"User-Agent": "foo"}
        )
        try:
            response.raise_for_status()
        except requests.HTTPError as e:
            raise ValidationError(e) from requests.HTTPError

        soup = BeautifulSoup(response.content)
        elements = soup.select(request.data["selector"])
        if not elements:
            raise ValidationError("No elements found")

        return JsonResponse({"result": str(elements[0])})
