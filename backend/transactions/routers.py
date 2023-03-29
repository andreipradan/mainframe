from rest_framework import routers

from transactions.views import TransactionViewSet

router = routers.SimpleRouter()

router.register("", TransactionViewSet, basename="transactions")


urlpatterns = router.urls
