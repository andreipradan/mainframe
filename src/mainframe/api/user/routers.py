from rest_framework import routers

from mainframe.api.user.viewsets import UserViewSet

router = routers.SimpleRouter(trailing_slash=False)
router.register("", UserViewSet, basename="users")
urlpatterns = router.urls
