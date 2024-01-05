from django.core.management import call_command
from huey import crontab
from huey.contrib.djhuey import HUEY, db_periodic_task


@db_periodic_task(crontab(minute=59, hour=23, day=2))
@HUEY.lock_task("backup-bots-lock")
def backup_bots():
    call_command("backup", app="bots")
