from rest_framework import serializers

from mainframe.events.models import Event, FavoriteBand


class EventSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source="source.name", read_only=True)

    class Meta:
        model = Event
        fields = "__all__"


class FavoriteBandSerializer(serializers.ModelSerializer):
    class Meta:
        model = FavoriteBand
        fields = ("id", "name", "external_id")
