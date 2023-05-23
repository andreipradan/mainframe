from pathlib import Path

from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.exceptions import MethodNotAllowed

from clients.os import get_folder_contents


@csrf_exempt
def get_list(request):
    if not request.method == "GET":
        raise MethodNotAllowed(request.method)

    root = Path("/var/log/")
    filename = request.GET.get("filename", "")
    if filename.startswith("/"):
        filename = filename[1:]
    if filename:
        try:
            with open(root / filename, "r") as file:
                return FileResponse(file.read())
        except (PermissionError, UnicodeDecodeError, FileNotFoundError) as e:
            return JsonResponse(status=400, data={"error": f"{e.reason}: {filename}"})

    path = request.GET.get("path", "")
    if path.startswith("/"):
        path = path[1:]

    try:
        results = get_folder_contents(Path(root / path))
    except FileNotFoundError:
        return JsonResponse(status=400, data={"error": f"Folder not found: {path}"})
    return JsonResponse(
        {
            "path": path,
            "results": results,
        },
        safe=False,
    )
