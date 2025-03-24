import logging

from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser

from mainframe.bots.models import Bot, Message
from mainframe.bots.serializers import BotSerializer, MessageSerializer

logger = logging.getLogger(__name__)


class BotViewSet(viewsets.ModelViewSet):
    queryset = Bot.objects.order_by("full_name")
    serializer_class = BotSerializer
    permission_classes = (IsAdminUser,)

    def get_permissions(self):
        if self.action == "webhook":
            return [AllowAny()]
        return super().get_permissions()


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.order_by("-date")
    serializer_class = MessageSerializer
    permission_classes = (IsAdminUser,)

    def get_queryset(self):
        queryset = super().get_queryset()
        if authors := self.request.query_params.getlist("author"):
            queryset = queryset.filter(author__full_name__in=authors)
        if chat_ids := self.request.query_params.getlist("chat_id"):
            queryset = queryset.filter(chat_id__in=chat_ids)
        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data["authors"] = (
            Message.objects.values_list("author__full_name", flat=True)
            .distinct("author__full_name")
            .order_by("author__full_name")
        )
        response.data["chat_ids"] = (
            Message.objects.values_list("chat_id", flat=True)
            .distinct("chat_id")
            .order_by("chat_id")
        )
        return response
