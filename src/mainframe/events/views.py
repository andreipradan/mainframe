from datetime import datetime, timedelta, timezone

from django.db.models import Func, Q
from django.utils import timezone as django_timezone
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

        if today_mode in {"active", "started", "weekend"}:
            # Calculate local date boundaries and convert to UTC for filtering
            local_now = django_timezone.localtime(django_timezone.now())
            today = local_now.date()
            weekday = today.weekday()  # 0 - Monday, 6 - Sunday

            if today_mode == "weekend":
                saturday = 5
                if weekday < saturday:
                    sat_date = today + timedelta(days=5 - weekday)
                    sun_date = sat_date + timedelta(days=1)
                elif weekday == saturday:  # Saturday
                    sat_date = today
                    sun_date = today + timedelta(days=1)
                else:  # Sunday
                    sat_date = today
                    sun_date = today

                # Create local weekend boundaries
                weekend_start_naive = datetime.combine(sat_date, datetime.min.time())
                weekend_start_local = django_timezone.make_aware(weekend_start_naive)

                weekend_end_naive = datetime.combine(
                    sun_date + timedelta(days=1), datetime.min.time()
                )
                weekend_end_local = django_timezone.make_aware(weekend_end_naive)

                # Convert to UTC for database queries
                range_start = weekend_start_local.astimezone(timezone.utc)
                range_end = weekend_end_local.astimezone(timezone.utc)
            else:
                # Create local date boundaries for today
                today_start_naive = datetime.combine(today, datetime.min.time())
                today_start_local = django_timezone.make_aware(today_start_naive)

                today_end_naive = datetime.combine(
                    today + timedelta(days=1), datetime.min.time()
                )
                today_end_local = django_timezone.make_aware(today_end_naive)

                # Convert to UTC for database queries
                range_start = today_start_local.astimezone(timezone.utc)
                range_end = today_end_local.astimezone(timezone.utc)

            if today_mode in ("active", "weekend"):
                queryset = queryset.filter(
                    Q(start_date__lt=range_end)
                    & (
                        Q(end_date__gte=range_start)
                        | (
                            Q(end_date__isnull=True)
                            & Q(start_date__gte=range_start)
                            & Q(start_date__lt=range_end)
                        )
                    )
                )
            else:  # started
                queryset = queryset.filter(
                    start_date__gte=range_start,
                    start_date__lt=range_end,
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
        categories_qs = Event.objects
        if city:
            location_queryset = location_queryset.filter(city=city)
            categories_qs = categories_qs.filter(city=city)
        response.data["locations"] = (
            location_queryset.values_list("location", flat=True)
            .distinct("location")
            .order_by("location")
        )

        response.data["categories"] = list(
            categories_qs.annotate(cat=Func("categories", function="unnest"))
            .values_list("cat", flat=True)
            .distinct("cat")
            .order_by("cat")
        )
        return response
