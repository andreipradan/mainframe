from rest_framework import routers

from api.devices.views import DeviceViewSet

router = routers.SimpleRouter()

router.register("", DeviceViewSet, basename="devices")


urlpatterns = router.urls
