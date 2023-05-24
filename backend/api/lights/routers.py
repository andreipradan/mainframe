from rest_framework import routers

from api.lights import views

router = routers.SimpleRouter()
router.register("", views.LightsViewSet, basename="lights")
urlpatterns = router.urls
