import asyncio
import hashlib
import hmac
import json
from ipaddress import ip_address, ip_network

import environ
import requests
from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden, HttpResponseServerError
from django.utils.encoding import force_bytes
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.exceptions import MethodNotAllowed
from telegram.constants import ParseMode

from mainframe.clients.chat import send_telegram_message
from mainframe.core.tasks import schedule_deploy

PREFIX = "[[GitHub]]"


@csrf_exempt
def mainframe(request):  # noqa: C901, PLR0911
    if not request.method == "POST":
        raise MethodNotAllowed(request.method)

    # Verify if request came from GitHub
    client_ip_address = ip_address(
        request.META.get("HTTP_X_FORWARDED_FOR").split(", ")[0]
    )
    env = environ.Env()
    response = requests.get(
        "https://api.github.com/meta",
        headers={"Authorization": f"Bearer {env('GITHUB_ACCESS_TOKEN')}"},
        timeout=30,
    )
    if response.status_code != status.HTTP_200_OK:
        asyncio.run(
            send_telegram_message(
                f"{PREFIX} Warning, {client_ip_address} tried "
                f"to call mainframe github webhook URL"
            )
        )
        return HttpResponseForbidden(f"Unexpected status: {response.status_code}")

    for valid_ip in response.json()["hooks"]:
        if client_ip_address in ip_network(valid_ip):
            break
    else:
        asyncio.run(
            send_telegram_message(
                f"{PREFIX} Warning, {client_ip_address} tried "
                f"to call mainframe github webhook URL"
            )
        )
        return HttpResponseForbidden("Permission denied.")

    # Verify the request signature
    header_signature = request.META.get("HTTP_X_HUB_SIGNATURE")
    if header_signature is None:
        asyncio.run(send_telegram_message(text=f"{PREFIX} No signature"))
        return HttpResponseForbidden("Permission denied.")

    sha_name, signature = header_signature.split("=")
    if sha_name != "sha1":
        asyncio.run(send_telegram_message(text=f"{PREFIX} operation not supported"))
        return HttpResponseServerError("Operation not supported.", status=501)

    mac = hmac.new(
        force_bytes(settings.SECRET_KEY),
        msg=force_bytes(request.body),
        digestmod=hashlib.sha1,
    )
    if not hmac.compare_digest(force_bytes(mac.hexdigest()), force_bytes(signature)):
        asyncio.run(send_telegram_message(text=f"{PREFIX} Permission denied"))
        return HttpResponseForbidden("Permission denied.")

    event = request.META.get("HTTP_X_GITHUB_EVENT", "ping")
    payload = json.loads(request.body)

    if event != "workflow_job":
        compare = payload.get("compare", "")
        new_changes_link = (
            f"<a target='_blank' href='{compare}'>new changes</a>" if compare else ""
        )
        branch = payload.get("ref", "").replace("refs/heads/", "")
        branch_message = f"on the <b>{branch}</b> branch" if branch else ""

        pusher = payload.get("pusher", {}).get("name", "")
        asyncio.run(
            send_telegram_message(
                text=f"<b>{pusher}</b> {event}ed {new_changes_link} "
                f"{branch_message}",
                parse_mode=ParseMode.HTML,
            )
        )
        return HttpResponse("pong")

    wf_data = payload.get(event)
    name = f"[{wf_data['workflow_name']}] {wf_data['name']}"
    if wf_data["head_branch"] != "main" or name != "[Mainframe pipeline] BE - Deploy":
        return HttpResponse(status=204)

    action = " ".join(payload["action"].split("_"))
    if action != "completed" or (conclusion := wf_data.get("conclusion")) != "success":
        return HttpResponse(status=204)

    message = (
        f"<a href='{wf_data['html_url']}'><b>{name}</b></a> {action}"
        f" {f'({conclusion.title()})' if conclusion else ''} "
    )
    message += f"🎉\n🍓 Deployment scheduled 🚀\n{schedule_deploy()}"

    asyncio.run(send_telegram_message(text=message, parse_mode=ParseMode.HTML))
    return HttpResponse(status=204)
