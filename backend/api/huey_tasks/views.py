import json
from operator import itemgetter

from django.http import JsonResponse, Http404
from django.utils.module_loading import autodiscover_modules
from huey.contrib.djhuey import HUEY
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from core.tasks import redis_client


class TasksViewSet(viewsets.ViewSet):
    permission_classes = (IsAdminUser,)

    @staticmethod
    def list(request):
        autodiscover_modules("tasks")
        periodic_tasks = [str(t).split()[0][:-1] for t in HUEY._registry.periodic_tasks]
        return JsonResponse(
            data={
                "results": sorted(
                    [
                        {
                            "name": t.split(".tasks.")[-1],
                            "app": t.split(".tasks.")[0],
                            "is_periodic": t in periodic_tasks,
                            "details": json.loads(
                                redis_client.get(t.split(".")[-1]) or "{}"
                            ),
                        }
                        for t in HUEY._registry._registry
                    ],
                    key=itemgetter("app", "name"),
                ),
            }
        )
