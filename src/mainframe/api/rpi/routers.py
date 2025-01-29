from rest_framework import routers

from mainframe.api.rpi import views

router = routers.SimpleRouter()
router.register("", views.RpiViewSet, basename="rpi")
urlpatterns = router.urls
