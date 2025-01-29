from rest_framework import routers

from mainframe.exchange.views import ExchangeRateViewSet

router = routers.SimpleRouter()
router.register("", ExchangeRateViewSet, basename="rates")
urlpatterns = router.urls
