import logging
from importlib import import_module

import telegram
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny

from api.bots.serializers import BotSerializer
from bots.models import Bot


class BotViewSet(viewsets.ModelViewSet):
    queryset = Bot.objects.order_by("full_name")
    serializer_class = BotSerializer
    permission_classes = (IsAuthenticated,)

    def get_permissions(self):
        if self.action == "webhook":
            return [AllowAny()]
        return super().get_permissions()

    @action(detail=True, methods=["put"], url_path="clear-webhook")
    def clear_webhook(self, request, **kwargs):
        instance = self.get_object()
        try:
            deleted = telegram.Bot(instance.token).delete_webhook()
        except telegram.error.TelegramError as e:
            return JsonResponse({"Telegram Error": e.message}, status=400)

        if not deleted:
            return JsonResponse({"Webhook": "Could not delete webhook"})

        serializer = self.get_serializer(instance, data={"webhook": None}, partial=True)
        serializer.is_valid(raise_exception=True)
        if instance.webhook != serializer.validated_data["webhook"]:
            self.perform_update(serializer)
        return JsonResponse(data=serializer.data)

    @action(detail=True, methods=["put"])
    def sync(self, request, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data={"token": instance.token}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return JsonResponse(data=serializer.data)

    @action(detail=True, methods=["post"])
    def webhook(self, request, **kwargs):
        instance = self.get_object()
        try:
            webhook_module = import_module(f"api.bots.webhooks.{instance.username}")
        except ModuleNotFoundError:
            logging.error(
                f"Got a webhook call for '{instance.username}' with no associated bot_hook implementation"
            )
            return JsonResponse(data={"status": "404"})
        webhook_module.call(request.data, instance)
        return JsonResponse(data={"status": "200"})
