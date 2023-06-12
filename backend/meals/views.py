from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from clients.meals import MealsClient
from meals.models import Meal
from meals.serializers import MealSerializer


class MealsPagination(PageNumberPagination):
    page_size = 300


class MealViewSet(viewsets.ModelViewSet):
    queryset = Meal.objects.order_by("-date", "type")
    serializer_class = MealSerializer
    permission_classes = (IsAuthenticated,)
    pagination_class = MealsPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        if start_date := self.request.query_params.get("start_date"):
            queryset = queryset.filter(date__gte=start_date)
        if end_date := self.request.query_params.get("end_date"):
            queryset = queryset.filter(date__lt=end_date)
        return queryset

    @action(detail=False, methods=["put"])
    def sync(self, request, **kwargs):
        MealsClient.fetch_meals()
        return super().list(request, **kwargs)
