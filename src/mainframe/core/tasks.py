import json

from django.conf import settings
from django.utils import timezone
from huey import crontab
from huey.contrib.djhuey import HUEY, periodic_task, task
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.logs import get_default_logger
from mainframe.clients.system import run_cmd

logger = get_default_logger(__name__)


def get_redis_client():
    return HUEY.storage.redis_client.from_url(settings.HUEY["connection"]["url"])


def log_status(key, error=None, **kwargs):
    redis_client = get_redis_client()
    key = f"tasks.{key}"
    new_event = {"timestamp": timezone.now().isoformat(), **kwargs}
    errors = [error] if error else []

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
def signal_handler(signal, t, exc=None):
    now = timezone.now().isoformat()
    kwargs = {"id": t.id, "status": signal, "timestamp": now}
    log_status(t.name, {"timestamp": now, "msg": str(exc)} if exc else None, **kwargs)


@task(expires=10)
def schedule_deploy():
    from mainframe.clients import cron

    prefix = "[Deploy]"
    if not (output := run_cmd("git pull origin main", logger=logger).strip()):
        send_telegram_message(text=f"{prefix} Could not git pull")
        return False

    if output == "Already up to date.":
        send_telegram_message(text=f"[{prefix}] {output}")
        return False

    if output.startswith("CONFLICT"):
        send_telegram_message(text=f"[{prefix}] Could not git pull - conflict")
        return False

    cmd_params = []
    msg_extra = []
    if "requirements.lock" in output:
        cmd_params.append("requirements")
        msg_extra.append("requirements")
    else:
        cmd_params.append("no-requirements")

    if (
        "deploy/" in output
        or "bots/management/commands/run_bot_polling.py" in output
        or "bots/management/commands/run_quiz_bot_polling.py" in output
        or "bots/management/commands/inlines" in output
    ):
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
        expression = instance.expression
    elif class_name == "Watcher":
        expression = instance.cron
    else:
        logger.error("Unknown task class: %s", class_name)
        return

    if kwargs:
        logger.info(
            "[%s][%s] schedule_task got kwargs: %s",
            instance.__class__.__qualname__,
            instance.name,
            kwargs,
        )

    task_name = f"{instance.__module__}.{instance.name}"
    if task_name in HUEY._registry._registry:
        task_class = HUEY._registry.string_to_task(task_name)
        HUEY._registry.unregister(task_class)
        logger.info("Unregistered task: %s", instance)
    if expression and instance.is_active:
        schedule = crontab(*expression.split())
        lock_task = HUEY.lock_task(f"{task_name}-lock")
        lock_task(periodic_task(schedule, name=instance.name)(instance.run))
        logger.info("[%s] Scheduled: %s (%s)", class_name, instance.name, expression)
