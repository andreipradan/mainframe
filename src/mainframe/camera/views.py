import shutil
from datetime import datetime
from operator import itemgetter
from pathlib import Path

import environ
from django.conf import settings
from django.http import JsonResponse
from google.cloud import storage
from mainframe.clients.logs import get_default_logger
from mainframe.clients.system import get_folder_contents
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser

config = environ.Env()

logger = get_default_logger(__name__)


def download_blob(blob_name, destination_path):
    storage_client = storage.Client()
    bucket = storage_client.bucket(config("GOOGLE_STORAGE_BUCKET"))
    bucket.blob(blob_name).download_to_filename(f"{destination_path}/{blob_name}")


def download_blob_into_memory(blob_name, bucket_var=None):
    storage_client = storage.Client()
    bucket = storage_client.bucket(config(bucket_var or "GOOGLE_STORAGE_BUCKET"))
    return bucket.blob(blob_name).download_as_string()


def list_blobs_with_prefix(prefix):
    storage_client = storage.Client()
    bucket_name = storage_client.bucket(config("GOOGLE_STORAGE_BUCKET"))
    return storage_client.list_blobs(bucket_name, prefix=prefix, delimiter="/")


class CameraViewSet(viewsets.ViewSet):
    base_path = settings.BASE_DIR / "build" / "static" / "media"
    permission_classes = (IsAdminUser,)

    def list(self, request, **kwargs):
        prefix = request.GET.get("path", kwargs.get("path", ""))
        if not prefix:
            prefix = datetime.now().strftime("%Y/%m")
            Path(f"{self.base_path}/{prefix}").mkdir(parents=True, exist_ok=True)
        blobs = list_blobs_with_prefix(f"{prefix}/" if prefix else None)
        local_files = list(
            map(itemgetter("name"), get_folder_contents(self.base_path / prefix))
        )
        files = [
            {
                "name": b.name.split("/")[-1],
                "is_file": True,
                "is_local": b.name.split("/")[-1] in local_files,
                "size": f"{(b.size / (1024 ** 2)):.2f}",
            }
            for b in blobs
            if b.name != prefix
        ]
        folders = [
            {
                "name": b[:-1],
                "is_file": False,
                "is_local": b.split("/")[:-1][-1] in local_files,
                "size": None,
            }
            for b in blobs.prefixes
        ]
        return JsonResponse(
            {
                "path": prefix,
                "results": folders + files,
            },
            safe=False,
        )

    @action(detail=False, methods=["put"], url_path="create-folder")
    def create_folder(self, request):
        folder = request.GET.get("folder", "")
        if not folder:
            return JsonResponse(status=400, data={"error": "Missing folder name"})

        Path(f"{self.base_path}/{folder}").mkdir()
        return self.list(request, path=folder)

    @action(detail=False, methods=["delete"])
    def delete(self, request):
        filename = request.GET.get("filename", "")
        if not filename:
            return JsonResponse(
                status=400, data={"error": f"Invalid filename: {filename}"}
            )

        file_path = "/".join(filename.split("/")[:-1])
        Path.unlink(self.base_path / filename)
        return self.list(request, path=file_path)

    @action(detail=False, methods=["delete"], url_path="delete-folder")
    def delete_folder(self, request):
        folder = request.GET.get("folder", "")
        if not folder:
            return JsonResponse(status=400, data={"error": "Missing folder name"})

        shutil.rmtree(self.base_path / folder)
        return self.list(request, path="/".join(folder.split("/")[:-1]))

    @action(detail=False, methods=["put"])
    def download(self, request):
        filename = request.GET.get("filename", "")
        if not filename:
            return JsonResponse(
                status=400, data={"error": f"Invalid filename: {filename}"}
            )

        file_path = "/".join(filename.split("/")[:-1])
        try:
            download_blob(filename, self.base_path)
        except FileNotFoundError:
            logger.warning("Path %s does not exist. Creating...", file_path)
            Path(f"{self.base_path}/{file_path}").mkdir(parents=True)
            download_blob(filename, self.base_path)
        return self.list(request, path=file_path)
