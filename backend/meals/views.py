from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from meals.models import Meal
from meals.serializers import MealSerializer


class MealViewSet(viewsets.ModelViewSet):
    queryset = Meal.objects.order_by("-date", "type")
    serializer_class = MealSerializer
    permission_classes = (IsAuthenticated,)
