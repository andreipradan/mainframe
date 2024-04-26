import logging

import psutil
from django.core.exceptions import ImproperlyConfigured
from django.core.management import CommandError, call_command
from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser

from clients.logs import MainframeHandler
from crons.models import Cron
from crons.serializers import CronSerializer

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


class CronViewSet(viewsets.ModelViewSet):
    queryset = Cron.objects.order_by("-is_active", "command")
    serializer_class = CronSerializer
    permission_classes = (IsAdminUser,)

    @action(detail=True, methods=["put"])
    def kill(self, request, **kwargs):
        instance: Cron = self.get_object()
        for process in psutil.process_iter():
            if instance.command in " ".join(process.cmdline()):
                process.kill()
                return JsonResponse(data={}, status=status.HTTP_204_NO_CONTENT)
        return JsonResponse(data={}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=["put"])
    def run(self, request, **kwargs):
        instance: Cron = self.get_object()
        command, *args = instance.command.split()
        args = {arg.split("=")[0].replace("--", ""): arg.split("=")[1] for arg in args}
        try:
            call_command(command, **args)
        except (CommandError, ImproperlyConfigured, KeyError, TypeError) as e:
            logger.exception(e)
            return JsonResponse(
                data={"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return JsonResponse(data={"detail": "ok"}, status=status.HTTP_204_NO_CONTENT)
