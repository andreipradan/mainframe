from mainframe.crons.views import CronViewSet
from rest_framework import routers

router = routers.SimpleRouter()

router.register("", CronViewSet, basename="crons")


urlpatterns = router.urls
