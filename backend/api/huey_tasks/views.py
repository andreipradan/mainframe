import json
from importlib import import_module

from django.http import JsonResponse
from django.utils.module_loading import autodiscover_modules
from huey.contrib.djhuey import HUEY
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser

from core.tasks import redis_client


def task_sorter(item):
    return (
        -bool(item.get("history", [])),
        item["app"],
        item["name"],
    )


class TasksViewSet(viewsets.ViewSet):
    permission_classes = (IsAdminUser,)

    @action(methods=["delete"], detail=True, url_path="delete-history")
    def delete_history(self, request, *args, **kwargs):
        results = redis_client.delete(kwargs["pk"])
        if results:
            return self.list(request)
        return JsonResponse(status=status.HTTP_400_BAD_REQUEST, data={})

    @action(methods=["put"], detail=False, url_path="flush-locks")
    def flush_locks(self, *args, **kwargs):
        return JsonResponse(data={}, status=status.HTTP_204_NO_CONTENT)

    @staticmethod
    def list(request):
        def is_revoked(task):
            *module, task = task.split(".")
            module = ".".join(module)
            try:
                return getattr(import_module(module), task).is_revoked()
            except (AttributeError, ModuleNotFoundError, ValueError) as e:
                return str(e)

        autodiscover_modules("tasks")
        periodic_tasks = [str(t).split()[0][:-1] for t in HUEY._registry.periodic_tasks]
        return JsonResponse(
            data={
                "results": sorted(
                    [
                        {
                            "app": t.split(".tasks.")[0],
                            "name": t.split(".tasks.")[-1],
                            "is_periodic": t in periodic_tasks,
                            "is_revoked": is_revoked(t),
                            **json.loads(redis_client.get(t.split(".")[-1]) or "{}"),
                        }
                        for t in HUEY._registry._registry
                    ],
                    key=task_sorter,
                ),
            }
        )
