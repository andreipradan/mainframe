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

from clients import cron
from clients.chat import send_telegram_message

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
    client_ip_address = ip_address(
        request.META.get("HTTP_X_FORWARDED_FOR").split(", ")[0]
    )
    whitelist = requests.get("https://api.github.com/meta").json()["hooks"]

    prefix = "[GitHub]"

    for valid_ip in whitelist:
        if client_ip_address in ip_network(valid_ip):
            break
    else:
        return HttpResponseForbidden("Permission denied.")

    # Verify the request signature
    header_signature = request.META.get("HTTP_X_HUB_SIGNATURE")
    if header_signature is None:
        send_telegram_message(text=f"{prefix} No signature")
        return HttpResponseForbidden("Permission denied.")

    sha_name, signature = header_signature.split("=")
    if sha_name != "sha1":
        send_telegram_message(text=f"{prefix} operation not supported")
        return HttpResponseServerError("Operation not supported.", status=501)

    mac = hmac.new(
        force_bytes(settings.SECRET_KEY),
        msg=force_bytes(request.body),
        digestmod=hashlib.sha1,
    )
    if not hmac.compare_digest(force_bytes(mac.hexdigest()), force_bytes(signature)):
        send_telegram_message(text=f"{prefix} Permission denied")
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
    send_telegram_message(
        text=f"{prefix} Got a '{event}' event{branch_message}{pusher_message}{compare_message}",
        parse_mode=telegram.ParseMode.HTML,
    )
    if event == "ping":
        return HttpResponse("pong")

    elif event == "workflow_run":
        wf_run = payload["workflow_run"]
        conclusion = f" | {wf_run['conclusion']}" if wf_run['conclusion'] else ""
        url = wf_run["html_url"]
        send_telegram_message(
            text=f"{prefix} {payload['action']}{conclusion} | <a href='{url}'>Details</a>",
            parse_mode=telegram.ParseMode.HTML,
        )

    elif event == "push" and branch == "main":
        output = run_cmd("git pull origin main")
        if not output:
            send_telegram_message(text=f"{prefix} Could not git pull")
            return HttpResponse("ok")
        if output.strip() == b"Already up to date.":
            send_telegram_message(text=f"[{prefix}] Already up to date")
            return HttpResponse("ok")

        if output.strip().startswith("CONFLICT"):
            send_telegram_message(text=f"[{prefix}] Conflict")
            return HttpResponse("ok")

        cmd_params = []
        msg_extra = []
        if "requirements.txt" in output.strip():
            cmd_params.append("requirements")
            msg_extra.append("requirements")
        else:
            cmd_params.append("no-requirements")

        if "deploy/" in output.strip():
            cmd_params.append("restart")
            msg_extra.append("Restart all services")
        else:
            msg_extra.append("Restart backend")

        msg = "[Mainframe] Local setup scheduled in ~1 min"
        if msg_extra:
            msg += f" (+ {' & '.join(msg_extra)})"

        send_telegram_message(text=msg)

        logs_path = f"{settings.LOGS_DIR}/deploy/"
        mkdir = f"mkdir -p {logs_path}`date +%Y`"
        output = f"{logs_path}`date +%Y`/`date +%Y-%m`.log 2>&1"

        deploy_cmd = f"$HOME/projects/mainframe/deploy/setup.sh {' '.join(cmd_params)}"
        command = f"{mkdir} && {deploy_cmd} >> {output}"
        cron.delay(command, is_management=False)

    return HttpResponse(status=204)
