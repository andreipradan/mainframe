from mainframe.camera import views
from rest_framework import routers

router = routers.SimpleRouter()
router.register("", views.CameraViewSet, basename="camera")
urlpatterns = router.urls
