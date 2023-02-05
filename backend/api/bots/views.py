import logging

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
        try:
            instance.call(request.data)
        except ModuleNotFoundError:
            logging.error(
                f"Got a webhook call for '{instance}' with no associated webhook implementation"
            )
            return JsonResponse(data={"status": "404"})
        return JsonResponse(data={"status": "200"})
