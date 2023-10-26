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
        request.META.get("HTTP_X_FORWARDED_FOR").split(", ")[0]
    )
    whitelist = requests.get("https://api.github.com/meta").json()["hooks"]

    for valid_ip in whitelist:
        if client_ip_address in ip_network(valid_ip):
            break
    else:
        send_telegram_message(
            f"{PREFIX} Warning, {client_ip_address} tried "
            f"to call mainframe github webhook URL"
        )
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
    if not hmac.compare_digest(force_bytes(mac.hexdigest()), force_bytes(signature)):
        send_telegram_message(text=f"{PREFIX} Permission denied")
        return HttpResponseForbidden("Permission denied.")

    # If request reached this point we are in a good shape
    # Process the GitHub events
    event = request.META.get("HTTP_X_GITHUB_EVENT", "ping")

    payload = json.loads(request.body)

    if event != "workflow_run":
        compare = payload.get("compare", "")
        new_changes_link = (
            f"<a target='_blank' href='{compare}'>new changes</a>" if compare else ""
        )
        branch = payload.get("ref", "").replace("refs/heads/", "")
        branch_message = f"on the <b>{branch}</b> branch" if branch else ""

        pusher = payload.get("pusher", {}).get("name", "")
        send_telegram_message(
            text=(f"<b>{pusher}</b> {event}ed {new_changes_link} " f"{branch_message}"),
            parse_mode=telegram.ParseMode.HTML,
        )
        return HttpResponse("pong")

    action = " ".join(payload["action"].split("_"))
    wf_run = payload["workflow_run"]
    name = wf_run["name"]
    conclusion = wf_run.get("conclusion", "")
    branch = wf_run["head_branch"]
    message = (
        f"<a href='{wf_run['html_url']}'><b>{name}</b></a> {action}"
        f" {f'({conclusion.title()})' if conclusion else ''} "
    )
    if branch == "main" and name == "unit tests":
        if action == "requested":
            message += f"\nCommit: \"{wf_run.get('display_title', branch)}\"\n"
        if conclusion == "success":
            schedule_deploy()
            message += "🎉\nDeployment scheduled 🚀"

    send_telegram_message(text=message, parse_mode=telegram.ParseMode.HTML)
    return HttpResponse(status=204)


"""
BOLOGA  Cristian - Lect.univ.dr. - 0 locuri disponibile) (Indisponibil)
Covaci Florina - Lect.univ.dr. - 0 locuri disponibile) (Indisponibil)
MICAN Daniel - Conf.univ.dr. - 0 locuri disponibile) (Indisponibil)
MOISUC  Diana - Asist.univ.dr. - 0 locuri disponibile) (Indisponibil)
Osman Cristina - Lect.univ.dr. - 0 locuri disponibile) (Indisponibil)
Sitar - Tăut Dan - Andrei - Conf.univ.dr. - 0 locuri disponibile) (Indisponibil)

Jecan  Sergiu - Conf.univ.dr. - 3 locuri disponibile)

BRESFELEAN  Paul - Lect.univ.dr. - 26 locuri disponibile)
BUCHMANN  Robert - Prof.univ.dr. - 1 locuri disponibile)
CHIS  George Sebastian - Lect.univ.dr. - 30 locuri disponibile)
Ghiran  Ana Maria - Lect.univ.dr. - 3 locuri disponibile)
LACUREZEANU  Ramona - Conf.univ.dr. - 7 locuri disponibile)
MOCEAN  Loredana - Conf.univ.dr. - 19 locuri disponibile)
Moldovan  Darie - Lect.univ.dr. - 17 locuri disponibile)
POPA  Silviu Claudiu - Lect.univ.dr. - 10 locuri disponibile)
SILAGHI Gheorghe Cosmin  - Prof.univ.dr. - 1 locuri disponibile)
Stan  Alexandru - Lect.univ.dr. - 28 locuri disponibile)
STANCA  Liana - Conf.univ.dr. - 1 locuri disponibile)
"""
