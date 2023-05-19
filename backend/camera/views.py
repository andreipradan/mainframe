import logging
from datetime import datetime
from time import sleep, time

import environ
from django.conf import settings
from django.http import JsonResponse
from google.api_core.exceptions import PreconditionFailed
from google.cloud import storage
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from clients.chat import send_telegram_message
from clients.logs import MainframeHandler
from clients.os import get_folder_contents

config = environ.Env()

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


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


def upload_blob(filename, destination):
    storage_client = storage.Client()
    bucket = storage_client.bucket(config("GOOGLE_STORAGE_BUCKET"))
    blob = bucket.blob(destination)
    generation_match_precondition = 0
    blob.upload_from_filename(
        filename, if_generation_match=generation_match_precondition
    )


class CameraViewSet(viewsets.ViewSet):
    base_path = settings.BASE_DIR / "build" / "static" / "media"
    permission_classes = (IsAuthenticated,)

    def list(self, request):
        path = request.GET.get("path")
        return JsonResponse(
            {
                "path": path or "/",
                "results": get_folder_contents(f"{self.base_path}/{path or ''}"),
            },
            safe=False,
        )

    @action(detail=False, methods=["put"])
    def picture(self, request):
        from picamera import PiCamera

        filename = f"{datetime.utcnow().isoformat()}.jpg"
        camera = PiCamera()
        camera.rotation = 270
        camera.start_preview()
        sleep(2)
        camera.capture(f"{self.base_path}/{filename}")
        camera.stop_preview()
        camera.close()
        send_telegram_message(photo=open(f"{self.base_path}/{filename}", "rb"))
        return JsonResponse(status=201, data={"filename": filename})

    @action(detail=False, methods=["put"])
    def upload(self, request):
        start = time()
        path = request.GET.get("path")
        files = list(
            filter(
                lambda item: item["is_file"] is True,
                get_folder_contents(f"{self.base_path}/{path or ''}"),
            )
        )
        errors_count = 0
        for file in files:
            try:
                upload_blob(f"{self.base_path}/{file['name']}", file["name"])
            except PreconditionFailed as e:
                logger.error(str(e))
                errors_count += 1
        return JsonResponse(
            {
                "messages": [
                    f"Successfully uploaded {len(files) - errors_count}",
                    f"Duration: {time() - start}",
                ],
                "errors": [f"{errors_count} errors encountered. See logs"],
            },
            safe=False,
        )
