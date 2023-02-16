import logging

from rest_framework import serializers
from earthquakes.models import Earthquake

logger = logging.getLogger(__name__)


class EarthquakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Earthquake
        fields = "__all__"
