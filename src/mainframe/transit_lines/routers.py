from rest_framework import routers

from mainframe.transit_lines.views import TransitViewSet

router = routers.SimpleRouter()

router.register("", TransitViewSet, basename="sources")


urlpatterns = router.urls
