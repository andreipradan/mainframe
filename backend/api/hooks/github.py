import hashlib
import hmac
import json
import logging
import subprocess
from ipaddress import ip_address, ip_network

import requests
import telegram
from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden, HttpResponseServerError
from django.utils.encoding import force_bytes
from django.views.decorators.csrf import csrf_exempt
from rest_framework.exceptions import MethodNotAllowed

from bots.models import Bot
from clients import cron

logger = logging.getLogger(__name__)


def run_cmd(cmd, prefix=None):
    prefix = prefix.upper() if prefix else cmd
    logger.info(f"[{prefix}] Starting")
    try:
        output = subprocess.check_output(cmd.split(" ")).decode("utf-8")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(
            "command '{}' return with error (code {}): {}".format(
                e.cmd, e.returncode, e.output
            )
        )
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

    bot = Bot.objects.get(additional_data__debug_chat_id__isnull=False)
    chat_id = bot.additional_data["debug_chat_id"]
    prefix = "[Mainframe][GitHub]"

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

    payload = json.loads(request.body)
    branch = payload.get("ref", "").replace("refs/heads/", "")
    branch_message = f" on <b>{branch}</b> branch" if branch else ""
    pusher = payload.get("pusher", {}).get("name", "")
    pusher_message = f" from {pusher}" if pusher else ""
    compare = payload.get("compare", "")
    compare_message = (
        f" | <a target='_blank' href='{compare}'>diff</a>" if compare else ""
    )
    bot.send_message(
        chat_id=chat_id,
        text=f"{prefix} Got a '{event}' event{branch_message}{pusher_message}{compare_message}",
        disable_notification=True,
        disable_web_page_preview=True,
        parse_mode=telegram.ParseMode.HTML,
    )
    if event == "ping":
        return HttpResponse("pong")

    elif event == "push" and branch == "main":
        output = run_cmd("git pull origin main")
        if not output:
            bot.send_message(chat_id=chat_id, text=f"{prefix} Could not git pull")
            return HttpResponse("ok")
        if output.strip() == b"Already up to date.":
            bot.send_message(chat_id=chat_id, text=f"[{prefix}] Already up to date")
            return HttpResponse("ok")

        if output.strip().startswith("CONFLICT"):
            bot.send_message(
                chat_id=chat_id, text=f"[{prefix}] Conflict", disable_notification=True
            )
            return HttpResponse("ok")

        cmd_params = []
        msg_extra = []
        if "frontend/" in output.strip():
            cmd_params.append("frontend")
            msg_extra.append("FE")
        else:
            cmd_params.append("no-frontend")

        if "requirements.txt" in output.strip():
            cmd_params.append("backend")
            msg_extra.append("BE")
        else:
            cmd_params.append("no-backend")

        if "deploy/" in output.strip():
            cmd_params.append("deploy")
            msg_extra.append("Restart all services")
        else:
            msg_extra.append("Restart backend")

        msg = "[Mainframe] Local setup scheduled in ~1 min"
        if msg_extra:
            msg += f" (+ {' & '.join(msg_extra)})"

        bot.send_message(chat_id=chat_id, text=msg, disable_notification=True)

        logs_path = "/var/log/mainframe/crons/deploy/"
        mkdir = f"mkdir -p {logs_path}`date +%Y`"
        output = f"{logs_path}`date +%Y`/`date +%Y-%m`.log 2>&1"

        deploy_cmd = f"$HOME/projects/mainframe/deploy/setup.sh {' '.join(cmd_params)}"
        command = f"{mkdir} && {deploy_cmd} >> {output}"
        cron.delay(command)

    return HttpResponse(status=204)
