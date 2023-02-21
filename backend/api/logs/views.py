import logging
from operator import itemgetter
from pathlib import Path

import environ
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.exceptions import MethodNotAllowed


logger = logging.getLogger(__name__)


@csrf_exempt
def get_list(request):
    if not request.method == "GET":
        raise MethodNotAllowed(request.method)

    path = request.GET.get("path")
    root = environ.Env()("LOGS_PATH", default=None)
    if not (path or root):
        raise FileNotFoundError

    return JsonResponse(
        {
            "path": path or "/",
            "results": sorted(
                [
                    {
                        "name": str(item.resolve()).replace(root, ""),
                        "is_file": item.is_file(),
                    }
                    for item in Path((root + path) if path else root).iterdir()
                ],
                key=itemgetter("name"),
            ),
        },
        safe=False,
    )
