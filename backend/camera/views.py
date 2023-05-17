import base64
from datetime import datetime
from io import BytesIO
from operator import itemgetter
from time import sleep

import environ
from django.http import FileResponse, JsonResponse
from google.cloud import storage
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated


config = environ.Env()


def download_blob_into_memory(blob_name):
    storage_client = storage.Client()
    bucket = storage_client.bucket(config("GOOGLE_STORAGE_BUCKET"))
    return bucket.blob(blob_name).download_as_string()


def upload_blob_from_stream(file_obj, destination_blob_name):
    storage_client = storage.Client()
    bucket = storage_client.bucket(config("GOOGLE_STORAGE_BUCKET"))
    blob = bucket.blob(destination_blob_name)
    file_obj.seek(0)
    blob.upload_from_file(file_obj)


class CameraViewSet(viewsets.ViewSet):
    permission_classes = (IsAuthenticated,)

    @action(detail=False, methods=["get"], url_path=r"(?P<string>[\w\-.\w\-]+)")
    def file(self, request, filename):
        return FileResponse(download_blob_into_memory(filename), content_type="image/jpeg")

    def list(self, request):
        storage_client = storage.Client()
        path = request.GET.get("path")
        kwargs = {}
        if path:
            kwargs.update(
                {
                    "prefix": path,
                    "delimiter": "/",
                }
            )
        blobs = storage_client.list_blobs(config("GOOGLE_STORAGE_BUCKET"), **kwargs)
        results = sorted(
            [
                {
                    "name": blob.name,
                    "is_file": True,
                }
                for blob in blobs
            ],
            key=itemgetter("name"),
        )
        return JsonResponse(
            {
                "path": path or "/",
                "results": results,
            },
            safe=False,
        )

    @action(detail=False, methods=["put"])
    def picture(self, request):
        from picamera import PiCamera

        my_stream = BytesIO()
        camera = PiCamera()
        camera.rotation = 270
        camera.start_preview()
        sleep(2)
        camera.capture(my_stream, "jpeg")
        filename = f"{datetime.utcnow().isoformat()}.jpg"
        upload_blob_from_stream(my_stream, filename)
        return JsonResponse(status=201, data={"filename": filename})
