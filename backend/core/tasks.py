import json
from django.utils import timezone
from huey.contrib.djhuey import HUEY

redis_client = HUEY.storage.redis_client()


def log_status(key, **kwargs):
    new_event = {"timestamp": timezone.now().isoformat(), **kwargs}

    details = json.loads(redis_client.get(key) or "{}")
    if not details:
        details = {"history": [new_event], **new_event}
    else:
        if "errors" in details:
            details["errors"] = [
                *new_event.pop("errors", []),
                *details["errors"][:30],
            ]
        details.update(new_event)
        details["history"] = [new_event, *details["history"][:1000]]
    redis_client.set(key, json.dumps(details))
    return details


@HUEY.signal()
def signal_handler(signal, task, exc=None):
    now = timezone.now().isoformat()
    kwargs = {"errors": [], "id": task.id, "status": signal, "timestamp": now}
    if exc:
        kwargs["errors"].append({"msg": str(exc), "timestamp": now})
    log_status(task.name, **kwargs)
