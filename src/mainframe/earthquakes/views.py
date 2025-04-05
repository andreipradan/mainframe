import json

from django.conf import settings
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated

from mainframe.bots.models import Bot
from mainframe.earthquakes.models import Earthquake
from mainframe.earthquakes.serializers import EarthquakeSerializer


class EarthquakeViewSet(viewsets.ModelViewSet):
    queryset = Earthquake.objects.order_by("-timestamp")
    serializer_class = EarthquakeSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.query_params.get("largest_events") == "true":
            queryset = queryset.order_by("-magnitude", "-timestamp")
        if self.request.query_params.get("local_events") == "true":
            queryset = queryset.filter(is_local=True)
        if self.request.query_params.get("magnitude_gt5") == "true":
            queryset = queryset.filter(magnitude__gt=5)
        return queryset

    def get_permissions(self):
        if self.action == "map":
            return [AllowAny()]
        return super().get_permissions()

    @action(methods=["get"], detail=False)
    def map(self, request, **kwargs):
        data_path = settings.BASE_DIR / "earthquakes" / "maps"
        with open(data_path / f"{request.GET.get('id')}.json") as county:
            return JsonResponse(json.load(county))

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        bot = Bot.objects.filter(additional_data__earthquake__isnull=False).first()
        if bot:
            config = bot.additional_data["earthquake"]
            response.data["last_check"] = config.get("last_check", {})
        return response
