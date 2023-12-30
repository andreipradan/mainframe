from django.core.management import call_command
from huey import crontab
from huey.contrib.djhuey import HUEY, db_periodic_task


@db_periodic_task(crontab(minute="*/1"))
@HUEY.lock_task("infp-lock")
def check_infp():
    call_command("check_infp")


@db_periodic_task(crontab(minute="*/1"))
@HUEY.lock_task("usgs-lock")
def check_usgs():
    call_command("check_usgs")
