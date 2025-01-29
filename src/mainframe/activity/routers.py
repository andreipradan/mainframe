from rest_framework import routers

from mainframe.activity.views import ActionViewSet

router = routers.SimpleRouter()
router.register("", ActionViewSet, basename="feed")
urlpatterns = router.urls
