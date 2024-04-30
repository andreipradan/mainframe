from mainframe.bots.views import BotViewSet, MessageViewSet
from rest_framework import routers

router = routers.SimpleRouter()

router.register("bots", BotViewSet, basename="bots")
router.register("messages", MessageViewSet, basename="messages")


urlpatterns = router.urls
