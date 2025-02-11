from rest_framework import serializers

from mainframe.earthquakes.models import Earthquake


class EarthquakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Earthquake
        fields = "__all__"
