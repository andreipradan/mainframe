import json
import logging

from django.conf import settings
from django.utils import timezone
from huey import crontab
from huey.contrib.djhuey import HUEY, periodic_task, task
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.logs import MainframeHandler
from mainframe.clients.system import run_cmd

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


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
    from mainframe.clients import cron

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
    if "requirements.lock" in output.strip():
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


@task()
def schedule_task(instance, **kwargs):
    if (class_name := instance.__class__.__qualname__) == "Cron":
        display_name = instance.command
        expression = instance.expression
        task_name = f"crons.models.{display_name}"
    elif class_name == "Watcher":
        display_name = instance.name
        expression = instance.cron
        task_name = f"watchers.models.{display_name}"
    else:
        logger.error("Unknown task class: %s", class_name)
        return

    if kwargs:
        logger.info(
            "[%s][%s] schedule_task got kwargs: %s",
            instance.__class__.__qualname__,
            display_name,
            kwargs,
        )

    def wrapper():
        instance.run()

    if task_name in HUEY._registry._registry:
        task_class = HUEY._registry.string_to_task(task_name)
        HUEY._registry.unregister(task_class)
        logger.info("Unregistered task: %s", display_name)
    if expression:
        schedule = crontab(*expression.split())
        periodic_task(schedule, name=display_name)(wrapper)
        logger.info("Scheduled task: %s", display_name)
