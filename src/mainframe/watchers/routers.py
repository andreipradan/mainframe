from rest_framework import routers

from mainframe.watchers.views import WatcherViewSet

router = routers.SimpleRouter()

router.register("", WatcherViewSet, basename="watchers")


urlpatterns = router.urls
