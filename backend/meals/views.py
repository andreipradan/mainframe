from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from clients.meals import MealsClient
from meals.models import Meal
from meals.serializers import MealSerializer


class MealViewSet(viewsets.ModelViewSet):
    queryset = Meal.objects.order_by("-date", "type")
    serializer_class = MealSerializer
    permission_classes = (IsAuthenticated,)

    @action(detail=False, methods=["put"])
    def sync(self, request, **kwargs):
        MealsClient.fetch_meals()
        return super().list(request, **kwargs)
