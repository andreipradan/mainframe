from rest_framework import routers

from meals.views import MealViewSet

router = routers.SimpleRouter()

router.register("", MealViewSet, basename="meals")

urlpatterns = router.urls
