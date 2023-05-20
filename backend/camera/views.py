import ipaddress
import logging
from datetime import datetime
from io import BytesIO
from threading import Thread
from time import sleep, time

import environ
from django.conf import settings
from django.http import JsonResponse
from google.api_core.exceptions import PreconditionFailed
from google.cloud import storage
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission, IsAuthenticated

from clients.chat import send_photo
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


class IsAuthenticatedOrLocalNetwork(BasePermission):
    """
    Allows access only to authenticated users.
    """

    def has_permission(self, request, view):
        if bool(request.user and request.user.is_authenticated):
            return True
        local_network = ipaddress.ip_network("192.168.0.0/16")
        client_ip = ipaddress.ip_address(request.META["REMOTE_ADDR"])
        is_local_network = (
            client_ip in local_network or client_ip == ipaddress.ip_address("127.0.0.1")
        )
        if not is_local_network:
            return False
        auth_header = request.META.get("HTTP_LOCAL_NETWORK_TOKEN", "")
        if not auth_header:
            return False
        if auth_header == config("RPI_TOKEN"):
            return True
        return False


class CameraViewSet(viewsets.ViewSet):
    base_path = settings.BASE_DIR / "build" / "static" / "media"
    permission_classes = (IsAuthenticated,)

    def get_permissions(self):
        if self.action == "picture":
            return [IsAuthenticatedOrLocalNetwork()]
        return super().get_permissions()

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
        logger.info("[Picture] Taking picture...")
        from picamera import PiCamera
        filename = f"{datetime.utcnow().isoformat()}.jpg"
        camera = PiCamera()
        camera.rotation = 270
        camera.resolution = (720, 1024)
        camera.start_preview()
        sleep(1)
        camera.capture(f"{self.base_path}/{filename}")
        logger.info("[Picture] Captured")
        camera.stop_preview()
        camera.close()
        thread = Thread(
            target=send_photo,
            args=(open(f"{self.base_path}/{filename}", "rb"), ),
            kwargs={"logger": logger}
        )
        thread.start()
        logger.info("[Picture] ✅")
        return self.list(request)

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
