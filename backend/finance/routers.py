from rest_framework import routers

from finance.viewsets.account import AccountViewSet
from finance.viewsets.category import CategoryViewSet
from finance.viewsets.credit import CreditViewSet
from finance.viewsets.payment import PaymentViewSet
from finance.viewsets.prediction import PredictionViewSet
from finance.viewsets.stocks import StocksViewSet, PnLViewSet
from finance.viewsets.timetable import TimetableViewSet
from finance.viewsets.transaction import TransactionViewSet

router = routers.SimpleRouter()

router.register("accounts", AccountViewSet, basename="accounts")
router.register("categories", CategoryViewSet, basename="categories")
router.register("credit", CreditViewSet, basename="credit")
router.register("payments", PaymentViewSet, basename="payments")
router.register("pnl", PnLViewSet, basename="pnl")
router.register("prediction", PredictionViewSet, basename="prediction")
router.register("stocks", StocksViewSet, basename="stocks")
router.register("timetables", TimetableViewSet, basename="timetables")
router.register("transactions", TransactionViewSet, basename="transactions")


urlpatterns = router.urls
