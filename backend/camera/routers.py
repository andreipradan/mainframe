from rest_framework import routers

from . import views


router = routers.SimpleRouter()
router.register("", views.CameraViewSet, basename="camera")
urlpatterns = router.urls
