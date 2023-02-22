import logging
from operator import itemgetter
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.exceptions import MethodNotAllowed


logger = logging.getLogger(__name__)


@csrf_exempt
def get_list(request):
    if not request.method == "GET":
        raise MethodNotAllowed(request.method)

    if not (root := Path(settings.LOGGING["handlers"]["file"]["filename"]).parent):
        return JsonResponse(
            status=400, data={"error": "logger file handler - filename is not set"}
        )

    if filename := request.GET.get("filename"):
        try:
            with open(root + filename, "r") as file:
                return FileResponse(file.read())
        except UnicodeDecodeError as e:
            return JsonResponse(status=400, data={"Decode Error": str(e)})

    path = request.GET.get("path")
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
                key=itemgetter("is_file", "name"),
            ),
        },
        safe=False,
    )
