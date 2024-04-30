from mainframe.api.earthquakes.views import EarthquakeViewSet
from rest_framework import routers

router = routers.SimpleRouter()

router.register("", EarthquakeViewSet, basename="earthquakes")


urlpatterns = router.urls
