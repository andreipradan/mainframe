from rest_framework import routers

from expenses.views import ExpenseGroupViewSet

router = routers.SimpleRouter()
router.register("groups", ExpenseGroupViewSet, basename="expense_groups")
urlpatterns = router.urls
