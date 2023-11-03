import itertools
import logging

from django.core.exceptions import ImproperlyConfigured
from django.core.management import get_commands, call_command, CommandError
from django.http import JsonResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser

from clients.logs import MainframeHandler

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


class CommandsViewSet(viewsets.GenericViewSet):
    permission_classes = (IsAdminUser,)

    def list(self, request, *args, **kwargs):
        items = list(get_commands().items())
        items = sorted(items, key=lambda x: x[1])
        results = [
            {"app": app, "commands": [cmd[0] for cmd in cmds]}
            for (app, cmds) in itertools.groupby(items, key=lambda x: x[1])
            if app not in ["debug_toolbar", "huey.contrib.djhuey", "rest_framework"]
            and "django" not in app
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
