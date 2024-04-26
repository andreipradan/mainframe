import json
from importlib import import_module

from django.core.exceptions import BadRequest
from django.http import JsonResponse
from django.utils.module_loading import autodiscover_modules
from huey.contrib.djhuey import HUEY
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAdminUser

from core.tasks import get_redis_client


def is_revoked(task):
    *module, task = task.split(".")
    module = ".".join(module)
    try:
        return getattr(import_module(module), task).is_revoked()
    except (AttributeError, ModuleNotFoundError, ValueError) as e:
        return str(e)


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
        results = get_redis_client().delete(kwargs["pk"])
        if results:
            return self.list(request)
        return JsonResponse(status=status.HTTP_400_BAD_REQUEST, data={})

    @staticmethod
    def list(request):
        client = get_redis_client()
        autodiscover_modules("tasks")
        periodic_tasks = [str(t).split()[0][:-1] for t in HUEY._registry.periodic_tasks]
        return JsonResponse(
            data={
                "results": sorted(
                    [
                        {
                            "app": t.split(".")[0],
                            "name": t.split(".")[-1],
                            "id": f"{t.split('.')[0]}.{t.split('.')[-1]}",
                            "is_periodic": t in periodic_tasks,
                            "is_revoked": is_revoked(t),
                            **json.loads(
                                client.get(f"tasks.{t.split('.')[-1]}") or "{}"
                            ),
                        }
                        for t in HUEY._registry._registry
                    ],
                    key=task_sorter,
                ),
            }
        )

    @staticmethod
    def retrieve(*args, **kwargs):
        name = kwargs["pk"]
        client = get_redis_client()
        autodiscover_modules("tasks")
        periodic_tasks = [str(t).split()[0][:-1] for t in HUEY._registry.periodic_tasks]
        for t in HUEY._registry._registry:
            app, task_name = t.split(".")[0], t.split(".")[-1]
            if task_name == name:
                return JsonResponse(
                    data={
                        "app": app,
                        "name": name,
                        "id": f"{app}.{name}",
                        "is_periodic": t in periodic_tasks,
                        "is_revoked": is_revoked(t),
                        **json.loads(client.get(f"tasks.{name}") or "{}"),
                    },
                    safe=True,
                )
        raise NotFound()

    @action(methods=["put"], detail=True)
    def revoke(self, request, *args, **kwargs):
        task = kwargs["pk"]
        try:
            app = request.data["app"]
            method = request.data["method"]
            getattr(getattr(import_module(f"{app}.tasks"), task), method)()
        except (AttributeError, ModuleNotFoundError, ValueError) as e:
            raise BadRequest(str(e)) from e
        return self.list(request)
