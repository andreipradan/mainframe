from django.conf import settings
from django.core.management import call_command
from huey import crontab
from huey.contrib.djhuey import HUEY, db_periodic_task


@db_periodic_task(crontab(minute=5, hour=13, day_of_week="1-5"))
@HUEY.lock_task("fetch-bnr-rates-lock")
def fetch_bnr_rates():
    if settings.ENV != "prod":
        return
    call_command("fetch_exchange_rates", source="bnr")


@db_periodic_task(crontab(minute=10, hour=18, day_of_week="1-5"))
@HUEY.lock_task("fetch-ecb-rates-lock")
def fetch_ecb_rates():
    if settings.ENV != "prod":
        return
    call_command("fetch_exchange_rates", source="ecb")
