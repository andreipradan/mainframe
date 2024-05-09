import json
import logging

from django.conf import settings
from django.utils import timezone
from huey.contrib.djhuey import HUEY, task
from mainframe.clients import cron
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.logs import MainframeHandler
from mainframe.clients.system import run_cmd


def get_redis_client():
    return HUEY.storage.redis_client.from_url(settings.HUEY["connection"]["url"])


def log_status(key, errors=None, **kwargs):
    redis_client = get_redis_client()
    key = f"tasks.{key}"
    new_event = {"timestamp": timezone.now().isoformat(), **kwargs}
    errors = errors or []

    details = json.loads(redis_client.get(key) or "{}")
    if not details:
        details = {"errors": errors, "history": [new_event]}
    else:
        if "errors" not in details:
            details["errors"] = errors
        else:
            details["errors"] = [*errors, *details["errors"][:29]]
        details["history"] = [new_event, *details["history"][:999]]
    redis_client.set(key, json.dumps(details))
    return details


@HUEY.signal()
def signal_handler(signal, task, exc=None):
    if task.name in ["check_infp", "check_usgs", "healthcheck"] and not exc:
        return
    now = timezone.now().isoformat()
    errors = []
    kwargs = {"id": task.id, "status": signal, "timestamp": now}
    if exc:
        errors.append({"timestamp": now, "msg": str(exc)})
    log_status(task.name, errors, **kwargs)


@task(expires=10)
def schedule_deploy():
    logger = logging.getLogger(__name__)
    logger.addHandler(MainframeHandler())

    prefix = "[Deploy]"
    if not (output := run_cmd("git pull origin main", logger=logger)):
        send_telegram_message(text=f"{prefix} Could not git pull")
        return False
    if output.strip() == "Already up to date.":
        send_telegram_message(text=f"[{prefix}] {output.strip()}")
        return False

    if output.strip().startswith("CONFLICT"):
        send_telegram_message(text=f"[{prefix}] Could not git pull - conflict")
        return False

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

    msg = f"{prefix} Starting local setup"
    if msg_extra:
        msg += f" (+ {' & '.join(msg_extra)})"

    logs_path = "/var/log/mainframe/deploy/"
    mkdir = f"mkdir -p {logs_path}`date +%Y`"
    output = f"{logs_path}`date +%Y`/`date +%Y-%m`.log 2>&1"

    deploy_cmd = f"$HOME/projects/mainframe/deploy/setup.sh {' '.join(cmd_params)}"
    command = f"{mkdir} && {deploy_cmd} >> {output}"
    cron.delay(command)
    return msg
