from rest_framework import routers

from api.bots.views import BotViewSet

router = routers.SimpleRouter()

router.register("", BotViewSet, basename="bots")

urlpatterns = router.urls
