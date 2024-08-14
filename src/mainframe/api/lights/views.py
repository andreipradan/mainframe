import json

from django.http import JsonResponse
from mainframe.clients.lights import LightsClient, LightsException
from mainframe.clients.logs import get_default_logger
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser

logger = get_default_logger(__name__)


IP_REGEX = (
    r"(?P<ip>(?:(?:0|1[\d]{0,2}|2(?:[0-4]\d?|5[0-5]?|[6-9])?|[3-9]\d?)\.){3}"
    r"(?:0|1[\d]{0,2}|2(?:[0-4]\d?|5[0-5]?|[6-9])?|[3-9]\d?))"
)


class LightsViewSet(viewsets.ViewSet):
    lookup_field = "ip"
    permission_classes = (IsAdminUser,)

    @staticmethod
    def _request(what, **kwargs):
        logger.info("Lights: %s, args: %s", what, kwargs)
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

    @staticmethod
    def list(request):
        return JsonResponse(data={"results": LightsClient.get_bulbs()})

    @action(detail=False, methods=["patch"], url_path=f"{IP_REGEX}/set-brightness")
    def set_brightness(self, request, ip):
        body = json.loads(request.body)
        return self._request("set_brightness", ip=ip, brightness=body["brightness"])

    @action(detail=False, methods=["patch"], url_path=f"{IP_REGEX}/set-color-temp")
    def set_color_temp(self, request, ip):
        body = json.loads(request.body)
        return self._request("set_color_temp", ip=ip, color_temp=body["color_temp"])

    @action(detail=False, methods=["patch"], url_path=f"{IP_REGEX}/set-name")
    def set_name(self, request, ip):
        body = json.loads(request.body)
        return self._request("set_name", ip=ip, name=body["name"])

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
