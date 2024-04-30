from mainframe.meals.views import MealViewSet
from rest_framework import routers

router = routers.SimpleRouter()

router.register("", MealViewSet, basename="meals")


urlpatterns = router.urls
