from operator import itemgetter
from pathlib import Path

from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.exceptions import MethodNotAllowed


@csrf_exempt
def get_list(request):
    if not request.method == "GET":
        raise MethodNotAllowed(request.method)

    root = "/var/log"
    if filename := request.GET.get("filename"):
        try:
            with open(root + filename, "r") as file:
                return FileResponse(file.read())
        except (PermissionError, UnicodeDecodeError) as e:
            return JsonResponse(status=400, data={"error": str(e)})

    path = request.GET.get("path")
    return JsonResponse(
        {
            "path": path or "/",
            "results": sorted(
                [
                    {
                        "name": str(item).replace(root, ""),
                        "is_file": item.is_file(),
                    }
                    for item in Path((root + path) if path else root).iterdir()
                ],
                key=itemgetter("is_file", "name"),
            ),
        },
        safe=False,
    )
