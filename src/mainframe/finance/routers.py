from rest_framework import routers

from mainframe.finance.viewsets.account import AccountViewSet
from mainframe.finance.viewsets.category import CategoryViewSet
from mainframe.finance.viewsets.credit import CreditViewSet
from mainframe.finance.viewsets.crypto import CryptoViewSet
from mainframe.finance.viewsets.payment import PaymentViewSet
from mainframe.finance.viewsets.pension import PensionViewSet
from mainframe.finance.viewsets.prediction import PredictionViewSet
from mainframe.finance.viewsets.stocks import StocksViewSet
from mainframe.finance.viewsets.timetable import TimetableViewSet
from mainframe.finance.viewsets.transaction import TransactionViewSet

router = routers.SimpleRouter()

router.register("accounts", AccountViewSet, basename="accounts")
router.register("categories", CategoryViewSet, basename="categories")
router.register("credit", CreditViewSet, basename="credit")
router.register("crypto", CryptoViewSet, basename="crypto")
router.register("payments", PaymentViewSet, basename="payments")
router.register("pension", PensionViewSet, basename="pension")
router.register("prediction", PredictionViewSet, basename="prediction")
router.register("stocks", StocksViewSet, basename="stocks")
router.register("timetables", TimetableViewSet, basename="timetables")
router.register("transactions", TransactionViewSet, basename="transactions")


urlpatterns = router.urls
