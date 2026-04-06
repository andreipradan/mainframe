from rest_framework import serializers

from mainframe.events.models import Event


class EventSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source="source.name", read_only=True)

    class Meta:
        model = Event
        fields = "__all__"
