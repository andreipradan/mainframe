from rest_framework import routers

from credit.views import TimetableViewSet, PaymentViewSet, OverviewViewSet

router = routers.SimpleRouter()

router.register("", OverviewViewSet, basename="overview")
router.register("payments", PaymentViewSet, basename="payments")
router.register("timetables", TimetableViewSet, basename="timetables")


urlpatterns = router.urls
