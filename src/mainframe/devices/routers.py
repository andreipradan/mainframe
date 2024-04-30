from mainframe.devices.views import DeviceViewSet
from rest_framework import routers

router = routers.SimpleRouter()

router.register("", DeviceViewSet, basename="devices")


urlpatterns = router.urls
