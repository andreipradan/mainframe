from rest_framework import routers

from mainframe.events.views import EventViewSet, FavoriteBandViewSet

router = routers.SimpleRouter()

router.register("favorites", FavoriteBandViewSet, basename="favorite-bands")
router.register("", EventViewSet, basename="events")


urlpatterns = router.urls
