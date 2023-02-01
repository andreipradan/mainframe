import logging

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.exceptions import MethodNotAllowed

from api.lights.client import LightsClient

logger = logging.getLogger(__name__)


def get_list(request):
    if not request.method == "GET":
        raise MethodNotAllowed(request.method)
    return JsonResponse(data=LightsClient.get_bulbs(), safe=False)


@csrf_exempt
def turn_off(request, ip):
    if not request.method == "PUT":
        raise MethodNotAllowed(request.method)
    response = LightsClient.turn_off(ip)
    logger.info(response)
    return HttpResponse(response)


@csrf_exempt
def turn_on(request, ip):
    if not request.method == "PUT":
        raise MethodNotAllowed(request.method)
    response = LightsClient.turn_on(ip)
    logger.info(response)
    return HttpResponse(response)
