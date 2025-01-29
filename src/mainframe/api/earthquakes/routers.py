from rest_framework import routers

from mainframe.api.earthquakes.views import EarthquakeViewSet

router = routers.SimpleRouter()

router.register("", EarthquakeViewSet, basename="earthquakes")


urlpatterns = router.urls
