import hashlib
import hmac
import json
from ipaddress import ip_address, ip_network

import requests
import telegram
from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden, HttpResponseServerError
from django.utils.encoding import force_bytes
from django.views.decorators.csrf import csrf_exempt
from rest_framework.exceptions import MethodNotAllowed

from api.tasks import schedule_deploy
from clients.chat import send_telegram_message

PREFIX = "[GitHub]"


@csrf_exempt
def mainframe(request):
    if not request.method == "POST":
        raise MethodNotAllowed(request.method)

    # Verify if request came from GitHub
    client_ip_address = ip_address(
        request.META.get("HTTP_X_FORWARDED_FOR").split(", ")[0])
    whitelist = requests.get("https://api.github.com/meta").json()["hooks"]

    for valid_ip in whitelist:
        if client_ip_address in ip_network(valid_ip):
            break
    else:
        send_telegram_message(f"{PREFIX} Warning, {client_ip_address} tried "
                              f"to call mainframe github webhook URL")
        return HttpResponseForbidden("Permission denied.")

    # Verify the request signature
    header_signature = request.META.get("HTTP_X_HUB_SIGNATURE")
    if header_signature is None:
        send_telegram_message(text=f"{PREFIX} No signature")
        return HttpResponseForbidden("Permission denied.")

    sha_name, signature = header_signature.split("=")
    if sha_name != "sha1":
        send_telegram_message(text=f"{PREFIX} operation not supported")
        return HttpResponseServerError("Operation not supported.", status=501)

    mac = hmac.new(
        force_bytes(settings.SECRET_KEY),
        msg=force_bytes(request.body),
        digestmod=hashlib.sha1,
    )
    if not hmac.compare_digest(force_bytes(mac.hexdigest()),
                               force_bytes(signature)):
        send_telegram_message(text=f"{PREFIX} Permission denied")
        return HttpResponseForbidden("Permission denied.")

    # If request reached this point we are in a good shape
    # Process the GitHub events
    event = request.META.get("HTTP_X_GITHUB_EVENT", "ping")

    payload = json.loads(request.body)

    if event != "workflow_run":
        branch = payload.get("ref", "").replace("refs/heads/", "")
        branch_message = f"\nBranch: {branch}" if branch else ""
        pusher = payload.get("pusher", {}).get("name", "")
        author = f"\nAuthor: {pusher}" if pusher else ""
        compare = payload.get("compare", "")
        compare_message = (f"\n<a target='_blank' href='{compare}'>Compare</a>"
                           if compare else "")
        send_telegram_message(
            text=f"{PREFIX} Got a <b>{event}</b> event"
            f"{branch_message}{author}{compare_message}",
            parse_mode=telegram.ParseMode.HTML,
        )
        return HttpResponse("pong")
    action = " ".join(payload["action"].split("_")).title()
    wf_run = payload["workflow_run"]
    name = wf_run["name"]
    conclusion = wf_run.get("conclusion", "")
    branch = wf_run["head_branch"]
    message = (f"{PREFIX} <b>{name}</b> - {branch} - {action}"
               f"{f' ({conclusion.title()})' if conclusion else ''} "
               f"<a href='{wf_run['html_url']}'>Details</a>")
    if branch == "main" and name == "CI" and conclusion == "success":
        schedule_deploy()
        message += "\nDeployment scheduled"
    send_telegram_message(text=message, parse_mode=telegram.ParseMode.HTML)
    return HttpResponse(status=204)
