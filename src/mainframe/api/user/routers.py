from mainframe.api.user.viewsets import UserViewSet
from rest_framework import routers

router = routers.SimpleRouter(trailing_slash=False)
router.register("", UserViewSet, basename="users")
urlpatterns = router.urls
