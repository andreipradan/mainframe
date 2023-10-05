from rest_framework import routers

from api.user.viewsets import UserViewSet

router = routers.SimpleRouter(trailing_slash=False)

router.register(r"", UserViewSet, basename="users")

urlpatterns = router.urls
