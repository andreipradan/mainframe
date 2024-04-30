import factory.django
from mainframe.earthquakes.models import Earthquake


class EarthquakeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Earthquake

    depth = 1
    location = 1
    longitude = 1
    latitude = 1
    magnitude = 1
    timestamp = "2000-01-01 10:10:10+00:00"
