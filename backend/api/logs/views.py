from pathlib import Path

from django.http import JsonResponse, FileResponse
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from clients.os import get_folder_contents


class LogsViewSet(viewsets.ViewSet):
    base_path = Path("/var/log/")
    permission_classes = (IsAuthenticated,)

    def list(self, request):
        filename = request.GET.get("filename", "")
        if filename.startswith("/"):
            filename = filename[1:]
        if filename:
            try:
                with open(self.base_path / filename, "r") as file:
                    return FileResponse(file.read())
            except (PermissionError, UnicodeDecodeError, FileNotFoundError) as e:
                return JsonResponse(
                    status=400, data={"error": f"{e.reason}: {filename}"}
                )

        path = request.GET.get("path", "")
        if path.startswith("/"):
            path = path[1:]

        try:
            results = get_folder_contents(self.base_path / path)
        except FileNotFoundError:
            return JsonResponse(status=400, data={"error": f"Folder not found: {path}"})
        return JsonResponse(
            {
                "path": path,
                "results": results,
            },
            safe=False,
        )
