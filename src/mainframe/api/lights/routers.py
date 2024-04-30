from mainframe.api.lights import views
from rest_framework import routers

router = routers.SimpleRouter()
router.register("", views.LightsViewSet, basename="lights")
urlpatterns = router.urls
