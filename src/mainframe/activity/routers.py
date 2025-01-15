from mainframe.activity.views import ActionViewSet
from rest_framework import routers

router = routers.SimpleRouter()
router.register("", ActionViewSet, basename="feed")
urlpatterns = router.urls
