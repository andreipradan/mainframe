from django.conf import settings
from huey import crontab
from huey.contrib.djhuey import HUEY, periodic_task
from mainframe.clients import healthchecks
from mainframe.clients.logs import get_default_logger


@periodic_task(crontab(minute="*/5"))
@HUEY.lock_task("healthcheck-lock")
def healthcheck():
    if settings.ENV != "prod":
        return
    logger = get_default_logger(__name__)
    healthchecks.ping(logger)
