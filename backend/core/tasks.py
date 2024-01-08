import json
from django.utils import timezone
from huey.contrib.djhuey import HUEY

redis_client = HUEY.storage.redis_client()


def log_status(string, **kwargs):
    new_event = {"timestamp": timezone.now().isoformat(), **kwargs}

    details = json.loads(redis_client.get(string) or "{}")
    if not details:
        details = {"history": [new_event], **new_event}
    else:
        details.update(new_event)
        details["history"].insert(0, new_event)
    redis_client.set(string, json.dumps(details))
    return details


@HUEY.signal()
def signal_handler(signal, task, exc=None):
    kwargs = {"status": signal, "id": task.id}
    if exc:
        kwargs["error"] = str(exc)
    log_status(task.name, **kwargs)
