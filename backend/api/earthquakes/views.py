import json

from django.conf import settings
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated

from api.earthquakes.serializers import EarthquakeSerializer
from bots.models import Bot
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

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        bot = Bot.objects.filter(additional_data__earthquake__isnull=False).first()
        if bot:
            response.data["last_check"] = bot.additional_data["earthquake"].get(
                "last_check", None
            )
        return response
