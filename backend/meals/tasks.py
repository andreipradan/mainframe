from django.core.management import call_command
from huey import crontab
from huey.contrib.djhuey import HUEY, db_periodic_task


@db_periodic_task(crontab(minute=0, hour=11, day_of_week="0"))
@HUEY.lock_task("fetch-meals-lock")
def fetch_meals():
    call_command("fetch_meals")
