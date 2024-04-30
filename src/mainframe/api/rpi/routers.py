from mainframe.api.rpi import views
from rest_framework import routers

router = routers.SimpleRouter()
router.register("", views.RpiViewSet, basename="rpi")
urlpatterns = router.urls
