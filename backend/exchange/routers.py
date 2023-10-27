from rest_framework import routers

from exchange.views import ExchangeRateViewSet

router = routers.SimpleRouter()
router.register("rates", ExchangeRateViewSet, basename="rates")
urlpatterns = router.urls
