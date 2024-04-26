from rest_framework import routers

from bots.views import BotViewSet, MessageViewSet

router = routers.SimpleRouter()

router.register("bots", BotViewSet, basename="bots")
router.register("messages", MessageViewSet, basename="messages")


urlpatterns = router.urls
