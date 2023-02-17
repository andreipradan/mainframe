import logging

from rest_framework import serializers
from earthquakes.models import Earthquake

logger = logging.getLogger(__name__)


class EarthquakeSerializer(serializers.ModelSerializer):
    source_verbose = serializers.SerializerMethodField()

    class Meta:
        model = Earthquake
        fields = "__all__"

    def get_source_verbose(self, obj):
        return obj.get_source_display()
