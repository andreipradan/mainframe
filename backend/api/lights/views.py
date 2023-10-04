import json
import logging

from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from clients.lights import LightsClient, LightsException
from clients.logs import MainframeHandler

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())

IP_REGEX = (
    r"(?P<ip>(?:(?:0|1[\d]{0,2}|2(?:[0-4]\d?|5[0-5]?|[6-9])?|[3-9]\d?)\.){3}"
    r"(?:0|1[\d]{0,2}|2(?:[0-4]\d?|5[0-5]?|[6-9])?|[3-9]\d?))"
)


class LightsViewSet(viewsets.ViewSet):
    lookup_field = "ip"
    permission_classes = (IsAuthenticated,)

    def _request(self, what, **kwargs):
        logger.info(f"Lights: {what}, args: {kwargs}")
        try:
            data = {"data": getattr(LightsClient, what)(**kwargs)}
            status = 200
        except LightsException as e:
            data = {"error": str(e)}
            status = 400
        if "error" in data:
            logger.error(data["error"])
        else:
            logger.info(data["data"])
        return JsonResponse(data=data, status=status)

    def list(self, request):
        return JsonResponse(data=LightsClient.get_bulbs(), safe=False)

    @action(detail=False, methods=["patch"], url_path=f"{IP_REGEX}/set-brightness")
    def set_brightness(self, request, ip):
        body = json.loads(request.body)
        return self._request("set_brightness", ip=ip, brightness=body["brightness"])

    @action(detail=False, methods=["patch"], url_path=f"{IP_REGEX}/set-color-temp")
    def set_color_temp(self, request, ip):
        body = json.loads(request.body)
        return self._request("set_color_temp", ip=ip, color_temp=body["color_temp"])

    @action(detail=False, methods=["patch"], url_path=f"{IP_REGEX}/set-rgb")
    def set_rgb(self, request, ip):
        body = json.loads(request.body)
        return self._request("set_rgb", ip=ip, rgb=body["rgb"])

    @action(detail=False, methods=["put"], url_path="turn-all-off")
    def turn_all_off(self, request):
        return self._request("turn_all_off")

    @action(detail=False, methods=["put"], url_path="turn-all-on")
    def turn_all_on(self, request):
        return self._request("turn_all_on")

    @action(detail=False, methods=["put"], url_path=f"{IP_REGEX}/turn-off")
    def turn_off(self, request, ip):
        return self._request("turn_off", ip=ip)

    @action(detail=False, methods=["put"], url_path=f"{IP_REGEX}/turn-on")
    def turn_on(self, request, ip):
        return self._request("turn_on", ip=ip)
