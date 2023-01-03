from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from api.bots.serializers import BotSerializer
from bots.models import Bot


class BotViewSet(viewsets.ModelViewSet):
    queryset = Bot.objects.order_by("name")
    serializer_class = BotSerializer
    permission_classes = (IsAuthenticated,)
