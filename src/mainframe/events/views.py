from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from mainframe.events.models import Event
from mainframe.events.serializers import EventSerializer


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        queryset = super().get_queryset().select_related("source")
        city = self.request.query_params.get("city")
        categories = self.request.query_params.getlist("category")

        if city:
            queryset = queryset.filter(city=city)

        if any(categories):
            queryset = queryset.filter(category__in=categories)

        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)

        response.data["cities"] = (
            Event.objects.values_list("city", flat=True)
            .distinct("city")
            .order_by("city")
        )

        response.data["categories"] = list(
            Event.objects.values_list("category", flat=True)
            .distinct("category")
            .order_by("category")
        )
        return response
