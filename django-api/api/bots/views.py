import logging

import telegram
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from api.bots.serializers import BotSerializer
from bots.models import Bot


class BotViewSet(viewsets.ModelViewSet):
    queryset = Bot.objects.order_by("name")
    serializer_class = BotSerializer
    permission_classes = (IsAuthenticated,)

    @action(detail=True, methods=['put'], url_path="clear-webhook")
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

    @action(detail=True, methods=['get'], url_path="get-webhook")
    def get_webhook(self, request, **kwargs):
        instance = self.get_object()
        try:
            url = telegram.Bot(instance.token).get_webhook_info()["url"]
        except telegram.error.TelegramError as e:
            return JsonResponse({"Telegram Error": e.message}, status=400)

        serializer = self.get_serializer(instance, data={"webhook": url}, partial=True)
        serializer.is_valid(raise_exception=True)
        if instance.webhook != serializer.validated_data["webhook"]:
            self.perform_update(serializer)
        return JsonResponse(data=serializer.data)
