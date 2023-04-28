from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from clients.cron import get_all_crons, remove_crons_for_command, set_crons
from crons.models import Cron
from crons.serializers import CronSerializer


class CronViewSet(viewsets.ModelViewSet):
    queryset = Cron.objects.order_by("-is_active", "command")
    serializer_class = CronSerializer
    permission_classes = (IsAuthenticated,)

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
