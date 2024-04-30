from mainframe.api.groups.viewsets import GroupViewSet
from rest_framework import routers

router = routers.SimpleRouter()
router.register("", GroupViewSet, basename="groups")
urlpatterns = router.urls
