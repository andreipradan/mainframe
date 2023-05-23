import logging
from operator import itemgetter
from pathlib import Path

import environ
from django.conf import settings
from django.http import JsonResponse
from google.cloud import storage
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from clients.logs import MainframeHandler
from clients.os import get_folder_contents

config = environ.Env()

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


def download_blob(blob_name, destination_path):
    storage_client = storage.Client()
    bucket = storage_client.bucket(config("GOOGLE_STORAGE_BUCKET"))
    bucket.blob(blob_name).download_to_filename(f"{destination_path}/{blob_name}")


def download_blob_into_memory(blob_name):
    storage_client = storage.Client()
    bucket = storage_client.bucket(config("GOOGLE_STORAGE_BUCKET"))
    return bucket.blob(blob_name).download_as_string()


def list_blobs_with_prefix(prefix):
    storage_client = storage.Client()
    bucket_name = storage_client.bucket(config("GOOGLE_STORAGE_BUCKET"))
    return storage_client.list_blobs(bucket_name, prefix=prefix, delimiter="/")


class CameraViewSet(viewsets.ViewSet):
    base_path = settings.BASE_DIR / "build" / "static" / "media"
    permission_classes = (IsAuthenticated,)

    def list(self, request):
        prefix = request.GET.get("path", "")
        blobs = list_blobs_with_prefix(prefix)
        local_files = list(map(itemgetter("name"), get_folder_contents(self.base_path)))
        return JsonResponse(
            {
                "path": prefix or "/",
                "results": [{"name": b.name, "is_file": True, "is_local": b.name in local_files} for b in blobs],
            },
            safe=False,
        )

    @action(detail=False, methods=["delete"])
    def delete(self, request):
        filename = request.GET.get("filename", "")
        if not filename:
            return JsonResponse(status=400, data={"error": f"Invalid filename: {filename}"})

        Path.unlink(self.base_path / filename)
        return self.list(request)

    @action(detail=False, methods=["put"])
    def download(self, request):
        filename = request.GET.get("filename", "")
        if not filename:
            return JsonResponse(status=400, data={"error": f"Invalid filename: {filename}"})

        download_blob(filename, self.base_path)
        return self.list(request)
