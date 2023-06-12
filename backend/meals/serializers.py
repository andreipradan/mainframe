from rest_framework import serializers

from meals.models import Meal


class MealSerializer(serializers.ModelSerializer):
    type_verbose = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()

    class Meta:
        model = Meal
        fields = "__all__"

    def get_time(self, obj):
        return obj.time

    def get_type_verbose(self, obj):
        return obj.get_type_display()
