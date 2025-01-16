from datetime import datetime, timedelta

import environ
from crontab import CronTab
from mainframe.core.logs import get_default_logger

config = environ.Env()
logger = get_default_logger(__name__)


def delay(command):
    n = datetime.now() + timedelta(minutes=1)
    with CronTab(user=config("USERNAME")) as crontab:
        crontab.remove_all(command=command)
        cmd = crontab.new(command=command)
        cmd.setall(f"{n.minute} {n.hour} {n.day} {n.month} {n.weekday()}")
        cmd.enable()
    logger.info("Set cron for command %s ✅", command)
