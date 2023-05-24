import json
import logging

from django.http import JsonResponse, HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from clients.lights import LightsClient
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

    def list(self, request):
        return JsonResponse(data=LightsClient.get_bulbs(), safe=False)

    @action(detail=False, methods=["patch"], url_path=f'{IP_REGEX}/set-brightness')
    def set_brightness(self, request, ip):
        body = json.loads(request.body)
        response = LightsClient.set_brightness(ip, body["brightness"])
        logger.info(response)
        return HttpResponse(response)

    @action(detail=False, methods=["patch"], url_path=f'{IP_REGEX}/set-color-temp')
    def set_color_temp(self, request, ip):
        body = json.loads(request.body)
        response = LightsClient.set_color_temp(ip, body["color_temp"])
        logger.info(response)
        return HttpResponse(response)

    @action(detail=False, methods=["patch"], url_path=f'{IP_REGEX}/set-rgb')
    def set_rgb(self, request, ip):
        body = json.loads(request.body)
        response = LightsClient.set_rgb(ip, body["rgb"])
        logger.info(response)
        return HttpResponse(response)

    @action(detail=False, methods=["put"], url_path=f'turn-all-off')
    def turn_all_off(self, request):
        response = LightsClient.turn_all_off()
        return HttpResponse(response)

    @action(detail=False, methods=["put"], url_path=f'turn-all-on')
    def turn_all_on(self, request):
        response = LightsClient.turn_all_on()
        return HttpResponse(response)

    @action(detail=False, methods=["put"], url_path=f'{IP_REGEX}/turn-off')
    def turn_off(self, request, ip):
        response = LightsClient.turn_off(ip)
        logger.info(f"Turn off {ip}: {response}")
        return HttpResponse(response)

    @action(detail=False, methods=["put"], url_path=f'{IP_REGEX}/turn-on')
    def turn_on(self, request, ip):
        response = LightsClient.turn_on(ip)
        logger.info(f"Turn on {ip}: {response}")
        return HttpResponse(response)
