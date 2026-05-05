from datetime import timedelta

from django.db.models import Func, Q
from django.utils import timezone
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
        location = self.request.query_params.get("location")
        categories = self.request.query_params.getlist("category")
        today_mode = self.request.query_params.get("today_mode")

        if city:
            queryset = queryset.filter(city=city)

        if location:
            queryset = queryset.filter(location=location)

        if any(categories):
            queryset = queryset.filter(categories__overlap=categories)

        if today_mode in {"active", "started"}:
            now = timezone.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)

            if today_mode == "active":
                queryset = queryset.filter(
                    Q(start_date__lt=today_end)
                    & (
                        Q(end_date__gte=today_start)
                        | (
                            Q(end_date__isnull=True)
                            & Q(start_date__gte=today_start)
                            & Q(start_date__lt=today_end)
                        )
                    )
                )
            else:
                queryset = queryset.filter(
                    start_date__gte=today_start,
                    start_date__lt=today_end,
                )

        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)

        response.data["cities"] = (
            Event.objects.exclude(city="")
            .values_list("city", flat=True)
            .distinct("city")
            .order_by("city")
        )

        # Filter locations by selected city if one is chosen
        city = self.request.query_params.get("city")
        location_queryset = Event.objects.exclude(location="")
        if city:
            location_queryset = location_queryset.filter(city=city)
        response.data["locations"] = (
            location_queryset.values_list("location", flat=True)
            .distinct("location")
            .order_by("location")
        )

        response.data["categories"] = list(
            Event.objects.annotate(cat=Func("categories", function="unnest"))
            .values_list("cat", flat=True)
            .distinct("cat")
            .order_by("cat")
        )
        return response
