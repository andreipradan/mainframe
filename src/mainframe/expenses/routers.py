from rest_framework import routers

from mainframe.expenses.views import CarViewSet, ExpenseGroupViewSet, ExpenseViewSet

router = routers.SimpleRouter()
router.register("cars", CarViewSet, basename="car")
router.register("my", ExpenseViewSet, basename="expenses")
router.register("groups", ExpenseGroupViewSet, basename="groups")
urlpatterns = router.urls
