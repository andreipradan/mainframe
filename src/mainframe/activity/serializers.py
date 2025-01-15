from actstream.models import Action
from rest_framework import serializers


class ActionSerializer(serializers.ModelSerializer):
    action_object = serializers.CharField()
    actor = serializers.CharField()
    target = serializers.CharField()
    timesince = serializers.SerializerMethodField()
    title = serializers.CharField(source="__str__")

    class Meta:
        model = Action
        fields = "__all__"

    @staticmethod
    def get_timesince(obj):
        return f"{obj.timesince()} ago"
