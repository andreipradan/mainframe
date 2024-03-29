import logging

import psutil
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command, CommandError
from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser

from clients.cron import get_all_crons, remove_crons_for_command, set_crons
from clients.logs import MainframeHandler
from crons.models import Cron
from crons.serializers import CronSerializer


logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


class CronViewSet(viewsets.ModelViewSet):
    queryset = Cron.objects.order_by("-is_active", "command")
    serializer_class = CronSerializer
    permission_classes = (IsAdminUser,)

    def list(self, request, *args, **kwargs):
        crons = get_all_crons()
        self.queryset.bulk_create(
            objs=crons,
            update_conflicts=True,
            update_fields=[
                "command",
                "expression",
                "is_active",
                "is_management",
            ],
            unique_fields=list(*Cron._meta.unique_together),
        )
        return super().list(request=request, *args, **kwargs)

    def perform_create(self, serializer):
        instance = serializer.save()
        set_crons([instance], replace=False)

    def perform_destroy(self, instance):
        remove_crons_for_command(instance)
        super().perform_destroy(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        set_crons([instance], replace=True)

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
        if instance.is_management:
            command, *args = instance.command.split()
            args = {
                arg.split("=")[0].replace("--", ""): arg.split("=")[1] for arg in args
            }
            try:
                call_command(command, **args)
            except (CommandError, ImproperlyConfigured, KeyError, TypeError) as e:
                logger.exception(e)
                return JsonResponse(
                    data={"detail": "Command failed. Check logs"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return JsonResponse(data={}, status=status.HTTP_204_NO_CONTENT)
        return JsonResponse(
            data={"detail": "Not a management command"},
            status=status.HTTP_400_BAD_REQUEST,
        )
