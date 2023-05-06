from django.urls import path
from rest_framework import routers

from . import views
from . import consumers

websocket_urlpatterns = [
    path("ws/camera/", consumers.CameraConsumer.as_asgi()),
]

router = routers.SimpleRouter()
router.register("", views.CameraViewSet, basename="camera")
urlpatterns = router.urls
