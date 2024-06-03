from django.conf import settings
from huey import crontab
from huey.contrib.djhuey import HUEY, periodic_task
from mainframe.clients import healthchecks


@periodic_task(crontab(minute="*/5"))
@HUEY.lock_task("healthcheck-lock")
def healthcheck():
    if settings.ENV != "prod":
        return
    healthchecks.ping()
