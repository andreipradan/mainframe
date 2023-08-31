from rest_framework import routers

from finance.views import (
    AccountViewSet,
    CategoryViewSet,
    CreditViewSet,
    PaymentViewSet,
    TimetableViewSet,
    TransactionViewSet,
)

router = routers.SimpleRouter()

router.register("accounts", AccountViewSet, basename="accounts")
router.register("categories", CategoryViewSet, basename="categories")
router.register("credit", CreditViewSet, basename="credit")
router.register("payments", PaymentViewSet, basename="payments")
router.register("timetables", TimetableViewSet, basename="timetables")
router.register("transactions", TransactionViewSet, basename="transactions")


urlpatterns = router.urls
