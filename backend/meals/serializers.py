import logging

from rest_framework import serializers
from meals.models import Meal

logger = logging.getLogger(__name__)


class MealSerializer(serializers.ModelSerializer):
    type_verbose = serializers.SerializerMethodField()

    class Meta:
        model = Meal
        fields = "__all__"

    def get_type_verbose(self, obj):
        return obj.get_type_display()
