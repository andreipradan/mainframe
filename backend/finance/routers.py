from rest_framework import routers

from finance.views import (
    AccountViewSet,
    CategoryViewSet,
    CreditViewSet,
    ExchangeRateViewSet,
    PaymentViewSet,
    PredictionViewSet,
    TimetableViewSet,
    TransactionViewSet,
)

router = routers.SimpleRouter()

router.register("accounts", AccountViewSet, basename="accounts")
router.register("categories", CategoryViewSet, basename="categories")
router.register("credit", CreditViewSet, basename="credit")
router.register("exchange-rate", ExchangeRateViewSet, basename="exchange_rate")
router.register("payments", PaymentViewSet, basename="payments")
router.register("prediction", PredictionViewSet, basename="prediction")
router.register("timetables", TimetableViewSet, basename="timetables")
router.register("transactions", TransactionViewSet, basename="transactions")


urlpatterns = router.urls
