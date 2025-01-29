from rest_framework import routers

from mainframe.crons.views import CronViewSet

router = routers.SimpleRouter()

router.register("", CronViewSet, basename="crons")


urlpatterns = router.urls
