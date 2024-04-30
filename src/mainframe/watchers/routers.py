from mainframe.watchers.views import WatcherViewSet
from rest_framework import routers

router = routers.SimpleRouter()

router.register("", WatcherViewSet, basename="watchers")


urlpatterns = router.urls
