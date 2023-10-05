import logging

from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser

from api.bots.serializers import BotSerializer
from bots.models import Bot
from clients.logs import MainframeHandler

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


class BotViewSet(viewsets.ModelViewSet):
    queryset = Bot.objects.order_by("full_name")
    serializer_class = BotSerializer
    permission_classes = (IsAdminUser,)

    def get_permissions(self):
        if self.action == "webhook":
            return [AllowAny()]
        return super().get_permissions()

    @action(detail=True, methods=["put"])
    def sync(self, request, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data={}, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return JsonResponse(data=serializer.data)

    @action(detail=True, methods=["post"])
    def webhook(self, request, **kwargs):
        instance = self.get_object()
        if not (
            user := request.data.get(
                "message", request.data.get("callback_query", {})
            ).get("from", {})
        ):
            logger.error("No user found in webhook data")
            return JsonResponse(data={"status": "404"})
        if not any(
            (
                user.get("username") in instance.whitelist,
                str(user.get("id")) in instance.whitelist,
            )
        ):
            logger.error("User not whitelisted")
            return JsonResponse(data={"status": "404"})

        try:
            instance.call(request.data)
        except ModuleNotFoundError:
            logger.error(
                "Webhook call for '%s' with no associated webhook implementation",
                instance,
            )
            return JsonResponse(data={"status": "404"})
        return JsonResponse(data={"status": "200"})
