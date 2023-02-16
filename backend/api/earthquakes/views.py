from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from api.earthquakes.serializers import EarthquakeSerializer
from earthquakes.models import Earthquake


class EarthquakeViewSet(viewsets.ModelViewSet):
    queryset = Earthquake.objects.order_by("-timestamp")
    serializer_class = EarthquakeSerializer
    permission_classes = (IsAuthenticated,)
