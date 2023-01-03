from rest_framework import routers

from api.bots.views import BotViewSet

router = routers.SimpleRouter(trailing_slash=False)

router.register("", BotViewSet, basename="bots")


urlpatterns = router.urls
