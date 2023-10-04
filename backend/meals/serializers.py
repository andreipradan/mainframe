from rest_framework import serializers

from meals.models import Meal


class MealSerializer(serializers.ModelSerializer):
    type_verbose = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()

    class Meta:
        model = Meal
        fields = "__all__"

    @staticmethod
    def get_time(obj):
        return obj.time

    @staticmethod
    def get_type_verbose(obj):
        return obj.get_type_display()
