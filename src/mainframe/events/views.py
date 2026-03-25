from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from mainframe.events.constants import CATEGORY_CHOICES
from mainframe.events.models import Event
from mainframe.events.serializers import EventSerializer


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        queryset = super().get_queryset().select_related("source")
        city_slug = self.request.query_params.get("city")
        categories = self.request.query_params.getlist("category")

        if city_slug:
            queryset = queryset.filter(city_slug=city_slug)

        if any(categories):
            queryset = queryset.filter(category_id__in=categories)

        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)

        cities = (
            Event.objects.filter(city_slug__isnull=False)
            .exclude(city_slug="")
            .values_list("city_slug", "city_name")
            .distinct()
            .order_by("city_slug")
        )
        response.data["cities"] = [
            {"slug": slug, "name": name} for slug, name in cities
        ]

        category_ids = (
            Event.objects.values_list("category_id", flat=True)
            .distinct("category_id")
            .order_by("category_id")
        )
        category_dict = dict(CATEGORY_CHOICES)
        response.data["categories"] = [
            {"id": cat_id, "name": category_dict[cat_id]}
            for cat_id in category_ids
            if cat_id in category_dict
        ]
        return response
