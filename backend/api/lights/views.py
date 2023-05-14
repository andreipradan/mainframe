import json
import logging

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.exceptions import MethodNotAllowed

from clients.lights import LightsClient
from clients.logs import MainframeHandler

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


def get_list(request):
    if not request.method == "GET":
        raise MethodNotAllowed(request.method)
    return JsonResponse(data=LightsClient.get_bulbs(), safe=False)


@csrf_exempt
def set_brightness(request, ip):
    if not request.method == "PATCH":
        raise MethodNotAllowed(request.method)
    body = json.loads(request.body)
    response = LightsClient.set_brightness(ip, body["brightness"])
    logger.info(response)
    return HttpResponse(response)


@csrf_exempt
def set_color_temp(request, ip):
    if not request.method == "PATCH":
        raise MethodNotAllowed(request.method)
    body = json.loads(request.body)
    response = LightsClient.set_color_temp(ip, body["color_temp"])
    logger.info(response)
    return HttpResponse(response)


@csrf_exempt
def set_rgb(request, ip):
    if not request.method == "PATCH":
        raise MethodNotAllowed(request.method)
    body = json.loads(request.body)
    response = LightsClient.set_rgb(ip, body["rgb"])
    logger.info(response)
    return HttpResponse(response)


@csrf_exempt
def turn_all_off(request):
    if not request.method == "PUT":
        raise MethodNotAllowed(request.method)
    response = LightsClient.turn_all_off()
    return HttpResponse(response)


@csrf_exempt
def turn_all_on(request):
    if not request.method == "PUT":
        raise MethodNotAllowed(request.method)
    response = LightsClient.turn_all_on()
    return HttpResponse(response)


@csrf_exempt
def turn_off(request, ip):
    if not request.method == "PUT":
        raise MethodNotAllowed(request.method)
    response = LightsClient.turn_off(ip)
    logger.info(f"Turn off {ip}: {response}")
    return HttpResponse(response)


@csrf_exempt
def turn_on(request, ip):
    if not request.method == "PUT":
        raise MethodNotAllowed(request.method)
    response = LightsClient.turn_on(ip)
    logger.info(f"Turn on {ip}: {response}")
    return HttpResponse(response)
