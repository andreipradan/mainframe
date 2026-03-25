from urllib.parse import urljoin, urlparse

from rest_framework import serializers

from mainframe.events.models import Event


class EventSerializer(serializers.ModelSerializer):
    location_url = serializers.SerializerMethodField()
    source_name = serializers.CharField(source="source.name", read_only=True)

    class Meta:
        model = Event
        fields = "__all__"

    def get_location_url(self, obj):
        if obj.url and obj.location_slug:
            parsed = urlparse(obj.url)
            base = f"{parsed.scheme}://{parsed.netloc}"
            return urljoin(base, f"/hall/{obj.location_slug}")
        return None
