from rest_framework import routers

from expenses.views import ExpenseGroupViewSet, ExpenseViewSet

router = routers.SimpleRouter()
router.register("expenses", ExpenseViewSet, basename="expenses")
router.register("groups", ExpenseGroupViewSet, basename="groups")
urlpatterns = router.urls
