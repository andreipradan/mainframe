from django.core.management import call_command
from huey import crontab
from huey.contrib.djhuey import periodic_task, HUEY


@periodic_task(crontab(minute="*/1"))
@HUEY.lock_task("reports-lock")
def check_infp():
    call_command("check_infp")
