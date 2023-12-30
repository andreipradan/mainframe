from django.core.management import call_command
from huey import crontab
from huey.contrib.djhuey import HUEY, db_periodic_task


@db_periodic_task(crontab(minute=0, hour=11, day_of_week="6"))
@HUEY.lock_task("import-transit-lines-lock")
def import_transit_lines():
    call_command("import_transit_lines")
