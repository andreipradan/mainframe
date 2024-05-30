from datetime import datetime, timedelta
from typing import List

import environ
from crontab import CronTab
from mainframe.clients.logs import get_default_logger
from mainframe.crons.models import Cron

config = environ.Env()
logger = get_default_logger(__name__)


def delay(command):
    n = datetime.now() + timedelta(minutes=1)
    set_crons(
        [
            Cron(
                command=command,
                expression=f"{n.minute} {n.hour} {n.day} {n.month} {n.weekday()}",
                is_active=True,
            )
        ]
    )


def set_crons(crons: List[Cron], clear_all=False, replace=True):
    with CronTab(user=config("USERNAME")) as crontab:
        if clear_all:
            logger.warning("Clearing all existing crons")
            crontab.remove_all()
        for cron in crons:
            if not clear_all and replace:
                crontab.remove_all(command=cron.command)
            cmd = crontab.new(command=cron.command)
            cmd.setall(cron.expression)
            cmd.enable(cron.is_active)
    total_crons = len(crons)
    logger.info("Set %d cron%s ✅", total_crons, "s" if total_crons > 1 else "")
