from mainframe.expenses.views import ExpenseGroupViewSet, ExpenseViewSet
from rest_framework import routers

router = routers.SimpleRouter()
router.register("expenses", ExpenseViewSet, basename="expenses")
router.register("groups", ExpenseGroupViewSet, basename="groups")
urlpatterns = router.urls
