from django.conf import settings
from django.core.management import call_command
from huey import crontab
from huey.contrib.djhuey import HUEY, db_periodic_task


@db_periodic_task(crontab(minute="*/1"))
@HUEY.lock_task("infp-lock")
def check_infp():
    if settings.ENV != "prod":
        return
    call_command("check_infp")


@db_periodic_task(crontab(minute="*/1"))
@HUEY.lock_task("usgs-lock")
def check_usgs():
    if settings.ENV != "prod":
        return
    call_command("check_usgs")
