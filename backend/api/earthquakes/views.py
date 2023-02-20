import json

from django.conf import settings
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny

from api.earthquakes.serializers import EarthquakeSerializer
from earthquakes.models import Earthquake


class EarthquakeViewSet(viewsets.ModelViewSet):
    queryset = Earthquake.objects.order_by("-timestamp")
    serializer_class = EarthquakeSerializer
    permission_classes = (IsAuthenticated,)

    def get_permissions(self):
        if self.action == "map":
            return [AllowAny()]
        return super().get_permissions()

    @action(methods=["get"], detail=False)
    def map(self, request, **kwargs):
        data_path = settings.BASE_DIR / "api" / "earthquakes" / "maps"
        with open(data_path / f"{request.GET.get('id')}.json") as county:
            return JsonResponse(json.load(county))
