from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from crons.models import Cron
from crons.serializers import CronSerializer


class CronViewSet(viewsets.ModelViewSet):
    queryset = Cron.objects.order_by("-is_active", "command")
    serializer_class = CronSerializer
    permission_classes = (IsAuthenticated,)
