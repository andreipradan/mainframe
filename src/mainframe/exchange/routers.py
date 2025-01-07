from mainframe.exchange.views import ExchangeRateViewSet
from rest_framework import routers

router = routers.SimpleRouter()
router.register("", ExchangeRateViewSet, basename="rates")
urlpatterns = router.urls
