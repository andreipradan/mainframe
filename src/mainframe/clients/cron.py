from datetime import datetime, timedelta

import environ
import structlog
from crontab import CronTab

config = environ.Env()
logger = structlog.get_logger(__name__)


def delay(command):
    n = datetime.now() + timedelta(minutes=1)
    with CronTab(user=config("USERNAME")) as crontab:
        crontab.remove_all(command=command)
        cmd = crontab.new(command=command)
        cmd.setall(f"{n.minute} {n.hour} {n.day} {n.month} {n.weekday()}")
        cmd.enable()
    logger.info("Set cron for command", command=command)
