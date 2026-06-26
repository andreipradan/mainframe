from rest_framework import routers

from mainframe.events.views import EventViewSet

router = routers.SimpleRouter()

router.register("", EventViewSet, basename="events")


urlpatterns = router.urls
