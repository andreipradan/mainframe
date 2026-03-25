from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from mainframe.events.models import Event
from mainframe.events.serializers import EventSerializer


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        queryset = super().get_queryset()
        city_slug = self.request.query_params.get("city")

        if city_slug:
            queryset = queryset.filter(city_slug=city_slug)

        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)

        cities = (
            Event.objects.filter(city_slug__isnull=False)
            .exclude(city_slug="")
            .values_list("city_slug", flat=True)
            .distinct()
            .order_by("city_slug")
        )
        response.data["cities"] = list(cities)

        return response
