import itertools
import logging
import operator

from django.core.exceptions import ImproperlyConfigured
from django.core.management import CommandError, call_command, get_commands
from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser

from clients.logs import MainframeHandler
from crons.models import Cron
from crons.serializers import CronSerializer

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


class CommandsViewSet(viewsets.GenericViewSet):
    permission_classes = (IsAdminUser,)

    def list(self, request, *args, **kwargs):
        def filter_out(item):
            _, app = item
            if (
                app in ["debug_toolbar", "huey.contrib.djhuey", "rest_frameworkd"]
                or "django" in app
            ):
                return False
            return True

        commands = sorted(
            filter(filter_out, get_commands().items()), key=operator.itemgetter(1)
        )
        crons = {
            c.command: CronSerializer(c).data
            for c in Cron.objects.filter(
                command__in=map(operator.itemgetter(0), commands)
            )
        }
        results = [
            {
                "app": app,
                "commands": [
                    {
                        "name": cmd[0],
                        "cron": crons.get(cmd[0]),
                    }
                    for cmd in cmds
                ],
            }
            for (app, cmds) in itertools.groupby(commands, key=operator.itemgetter(1))
        ]
        data = {"results": results}
        return JsonResponse(data=data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["put"])
    def run(self, request, pk, **kwargs):
        args = request.data.get("args", "").split()
        try:
            call_command(pk, *args)
        except CommandError as e:
            return JsonResponse(
                data={"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except (
            AttributeError,
            ImproperlyConfigured,
            KeyError,
            TypeError,
            ValueError,
        ) as e:
            logger.exception(e)
            return JsonResponse(
                data={"detail": "Command failed. Check logs"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return JsonResponse(data={}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["put"], url_path="delete-cron")
    def delete_cron(self, request, pk, **kwargs):
        if cron_id := request.data.get("cron_id"):
            Cron.objects.get(id=cron_id).delete()
        else:
            Cron.objects.get(command=pk).delete()
        return self.list(request)

    @action(detail=True, methods=["put"], url_path="set-cron")
    def set_cron(self, request, pk, **kwargs):
        serializer_kwargs = {"data": {"command": pk, **request.data}}
        if cron_id := request.data.get("cron_id"):
            serializer_kwargs["instance"] = Cron.objects.get(id=cron_id)
        serializer = CronSerializer(**serializer_kwargs)
        if not serializer.is_valid():
            return JsonResponse(
                data=serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )
        serializer.save()
        return self.list(request)
