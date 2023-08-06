from rest_framework import routers

from finance.views import AccountViewSet
from finance.views import CreditViewSet
from finance.views import PaymentViewSet
from finance.views import TimetableViewSet
from finance.views import TransactionViewSet

router = routers.SimpleRouter()

router.register("accounts", AccountViewSet, basename="accounts")
router.register("credit", CreditViewSet, basename="credit")
router.register("payments", PaymentViewSet, basename="payments")
router.register("timetables", TimetableViewSet, basename="timetables")
router.register("transactions", TransactionViewSet, basename="transactions")


urlpatterns = router.urls
