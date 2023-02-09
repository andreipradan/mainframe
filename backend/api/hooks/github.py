import hashlib
import hmac
import logging
import subprocess
from ipaddress import ip_address, ip_network

import environ
import requests
import telegram
from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden, HttpResponseServerError
from django.utils.encoding import force_bytes
from django.views.decorators.csrf import csrf_exempt
from rest_framework.exceptions import MethodNotAllowed


logger = logging.getLogger(__name__)


def run_cmd(cmd, prefix=None):
    prefix = prefix.upper() if prefix else cmd
    logger.info(f"[{prefix}] Starting")
    output = subprocess.check_output(cmd.split(" ")).decode("utf-8")
    if output:
        logger.info(f"[{prefix}] Output: {str(output)}")
    logger.info(f"[{prefix}] Done.")
    return output


@csrf_exempt
def mainframe(request):
    if not request.method == "POST":
        raise MethodNotAllowed(request.method)

    # Verify if request came from GitHub
    forwarded_for = "{}".format(request.META.get("HTTP_X_FORWARDED_FOR"))
    client_ip_address = ip_address(forwarded_for)
    whitelist = requests.get("https://api.github.com/meta").json()["hooks"]

    config = environ.Env()

    bot = telegram.Bot(token=config("DEBUG_TOKEN"))
    chat_id = config("DEBUG_CHAT_ID")
    prefix = "[mainframe][github]"

    for valid_ip in whitelist:
        if client_ip_address in ip_network(valid_ip):
            break
    else:
        return HttpResponseForbidden("Permission denied.")

    # Verify the request signature
    header_signature = request.META.get("HTTP_X_HUB_SIGNATURE")
    if header_signature is None:
        bot.send_message(chat_id=chat_id, text=f"{prefix} No signature")
        return HttpResponseForbidden("Permission denied.")

    sha_name, signature = header_signature.split("=")
    if sha_name != "sha1":
        bot.send_message(chat_id=chat_id, text=f"{prefix} operation not supported")
        return HttpResponseServerError("Operation not supported.", status=501)

    mac = hmac.new(
        force_bytes(settings.SECRET_KEY),
        msg=force_bytes(request.body),
        digestmod=hashlib.sha1,
    )
    if not hmac.compare_digest(force_bytes(mac.hexdigest()), force_bytes(signature)):
        bot.send_message(chat_id=chat_id, text=f"{prefix} Permission denied")
        return HttpResponseForbidden("Permission denied.")

    # If request reached this point we are in a good shape
    # Process the GitHub events
    event = request.META.get("HTTP_X_GITHUB_EVENT", "ping")

    bot.send_message(chat_id=chat_id, text=f"{prefix} Got a '{event}' event")
    if event == "ping":
        return HttpResponse("pong")

    elif event == "push":
        output = run_cmd("git pull origin main")
        if not output:
            bot.send_message(chat_id=chat_id, text=f"{prefix} Could not git pull")
            return HttpResponse("ok")
        if output.strip() == b"Already up to date.":
            bot.send_message(chat_id=chat_id, text=f"[{prefix}] Already up to date")
            return HttpResponse("ok")

        if output.strip().startswith("CONFLICT"):
            bot.send_message(chat_id=chat_id, text=f"[{prefix}] Conflict")
            return HttpResponse("ok")

        setup_cmd = "./../deploy/setup.sh"
        msg = "[mainframe] Starting local setup"
        if "frontend/" in output.strip():
            setup_cmd += " frontend"
            msg += " (+FE)"

        bot.send_message(chat_id=chat_id, text=msg)
        run_cmd(setup_cmd)

        bot.send_message(chat_id=chat_id, text=f"[{prefix}] Deployed successfully")
        return HttpResponse("success")

    return HttpResponse(status=204)
