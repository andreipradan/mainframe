import json

from django.conf import settings
from django.utils import timezone
from huey.contrib.djhuey import HUEY


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
    now = timezone.now().isoformat()
    errors = []
    kwargs = {"id": task.id, "status": signal, "timestamp": now}
    if exc:
        errors.append({"timestamp": now, "msg": str(exc)})
    log_status(task.name, errors, **kwargs)
