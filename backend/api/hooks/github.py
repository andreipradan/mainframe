import hashlib
import hmac
import logging
import socket
import subprocess

import environ
import telegram
from django.conf import settings
from django.core.exceptions import BadRequest
from django.http import HttpResponse
from rest_framework.exceptions import MethodNotAllowed


logging.basicConfig(format="%(asctime)s - %(levelname)s:%(name)s - %(message)s")
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def run_cmd(cmd, prefix=None):
    logger.debug(f"[{prefix.upper()}] Starting")
    output = subprocess.check_output(cmd.split(" ")).decode("utf-8")
    if output:
        logger.debug(f"[{prefix.upper()}] Output: {str(output)}")
    logger.info(f"[{prefix.upper()}] Done.")
    return output


def validate_signature(data, secret, headers):
    sig_header = "X-Hub-Signature-256"
    if sig_header not in headers:
        return False
    computed_sign = hmac.new(secret.encode("utf-8"), data, hashlib.sha256).hexdigest()
    _, signature = headers[sig_header].split("=")
    return hmac.compare_digest(signature, computed_sign)


def mainframe(request):
    if not request.method == "POST":
        raise MethodNotAllowed(request.method)

    config = environ.Env()

    bot = telegram.Bot(token=config("DEBUG_TOKEN"))
    chat_id = config("DEBUG_CHAT_ID")
    host_name = socket.gethostname()

    if not validate_signature(request.POST, settings.SECRET_KEY, request.headers):
        bot.send_message(chat_id=chat_id, text=f"[{host_name}] Invalid hook signature")
        raise BadRequest("Invalid signature")

    output = run_cmd("git pull origin main")
    if not output:
        bot.send_message(
            chat_id=chat_id, text=f"[{host_name}] Could not git pull"
        )
        return HttpResponse("ok")

    if output.strip() == b"Already up to date.":
        bot.send_message(
            chat_id=chat_id, text=f"[{host_name}] [git pull] No new changes"
        )
        return HttpResponse("ok")

    if output.strip().startswith("CONFLICT"):
        bot.send_message(
            chat_id=chat_id, text=f"[{host_name}] [git pull] Conflict"
        )
        return HttpResponse("ok")

    run_cmd("./deploy/setup.sh")

    bot.send_message(
        chat_id=chat_id, text=f"[{host_name}] Mainframe deployed successfully"
    )
    return HttpResponse("ok")
