from mainframe.earthquakes.models import Earthquake
from rest_framework import serializers


class EarthquakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Earthquake
        fields = "__all__"
