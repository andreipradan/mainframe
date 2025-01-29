from rest_framework import routers

from mainframe.api.groups.viewsets import GroupViewSet

router = routers.SimpleRouter()
router.register("", GroupViewSet, basename="groups")
urlpatterns = router.urls
