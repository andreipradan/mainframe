from rest_framework import routers

from mainframe.earthquakes.views import EarthquakeViewSet

router = routers.SimpleRouter()

router.register("", EarthquakeViewSet, basename="earthquakes")


urlpatterns = router.urls
