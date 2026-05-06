from calendar import FRIDAY, SATURDAY
from datetime import datetime, timedelta, timezone

from django.db.models import Func, Q
from django.utils import timezone as django_timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from mainframe.events.models import Event
from mainframe.events.serializers import EventSerializer


def filter_by_period(queryset, period_filter, include_ongoing):
    if period_filter in {"today", "weekend"}:
        today = django_timezone.localtime(django_timezone.now()).date()

        if period_filter == "weekend":
            weekday = today.weekday()
            if weekday < FRIDAY:
                fri_date = today + timedelta(days=4 - weekday)
                sun_date = fri_date + timedelta(days=2)
            elif weekday == FRIDAY:
                fri_date = today
                sun_date = fri_date + timedelta(days=2)
            elif weekday == SATURDAY:
                fri_date = today - timedelta(days=1)
                sun_date = today + timedelta(days=1)
            else:
                fri_date = today - timedelta(days=2)
                sun_date = today

            range_start_naive = datetime.combine(fri_date, datetime.min.time())
            range_end_naive = datetime.combine(
                sun_date + timedelta(days=1), datetime.min.time()
            )
        else:
            range_start_naive = datetime.combine(today, datetime.min.time())
            range_end_naive = datetime.combine(
                today + timedelta(days=1), datetime.min.time()
            )

        range_start = django_timezone.make_aware(range_start_naive).astimezone(
            timezone.utc
        )
        range_end = django_timezone.make_aware(range_end_naive).astimezone(timezone.utc)

        if period_filter in {"active", "weekend"} or include_ongoing == "true":
            queryset = queryset.filter(
                Q(start_date__lt=range_end)
                & (Q(end_date__gte=range_start) | Q(end_date__isnull=True))
            )
        else:
            queryset = queryset.filter(
                start_date__gte=range_start,
                start_date__lt=range_end,
            )
    return queryset


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        queryset = super().get_queryset().select_related("source")

        categories = self.request.query_params.getlist("category")
        city = self.request.query_params.get("city")
        include_ongoing = self.request.query_params.get("include_ongoing")
        location = self.request.query_params.get("location")
        period_filter = self.request.query_params.get("period_filter")

        if city:
            queryset = queryset.filter(city=city)

        if location:
            queryset = queryset.filter(location=location)

        if any(categories):
            queryset = queryset.filter(categories__overlap=categories)

        return filter_by_period(queryset, period_filter, include_ongoing)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)

        response.data["cities"] = (
            Event.objects.exclude(city="")
            .values_list("city", flat=True)
            .distinct("city")
            .order_by("city")
        )

        location_queryset = Event.objects.exclude(location="")
        categories_qs = Event.objects

        if categories := self.request.query_params.getlist("category"):
            location_queryset = location_queryset.filter(categories__overlap=categories)

        if city := self.request.query_params.get("city"):
            categories_qs = categories_qs.filter(city=city)
            location_queryset = location_queryset.filter(city=city)

        if location := self.request.query_params.get("location"):
            categories_qs = categories_qs.filter(location=location)

        if period_filter := self.request.query_params.get("period_filter"):
            include_ongoing = self.request.query_params.get("include_ongoing")
            categories_qs = filter_by_period(
                categories_qs, period_filter, include_ongoing
            )
            location_queryset = filter_by_period(
                location_queryset, period_filter, include_ongoing
            )
        response.data["categories"] = list(
            categories_qs.annotate(cat=Func("categories", function="unnest"))
            .values_list("cat", flat=True)
            .distinct("cat")
            .order_by("cat")
        )
        response.data["locations"] = (
            location_queryset.values_list("location", flat=True)
            .distinct("location")
            .order_by("location")
        )
        return response
