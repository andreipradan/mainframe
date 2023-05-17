from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.exceptions import MethodNotAllowed

from clients.os import get_folder_contents


@csrf_exempt
def get_list(request):
    if not request.method == "GET":
        raise MethodNotAllowed(request.method)

    root = "/var/log"
    if filename := request.GET.get("filename"):
        try:
            with open(f"{root}/{filename}", "r") as file:
                return FileResponse(file.read())
        except (PermissionError, UnicodeDecodeError) as e:
            return JsonResponse(status=400, data={"error": str(e)})

    path = request.GET.get("path")
    return JsonResponse(
        {
            "path": path or "/",
            "results": get_folder_contents(f"{root}/{path or ''}"),
        },
        safe=False,
    )
