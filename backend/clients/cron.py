import logging
from datetime import datetime, timedelta
from typing import List

import environ
from crontab import CronTab

from crons.models import Cron

config = environ.Env()
logger = logging.getLogger(__name__)


def delay(command, minutes=1):
    n = datetime.now() + timedelta(minutes=minutes)
    expression = f"{n.minute} {n.hour} {n.day} {n.month} {n.weekday()}"
    set_crons([Cron(command=command, expression=expression)])


def remove_crons_for_command(command):
    with CronTab(user=config("USERNAME")) as cron:
        if not (crons_no := len(list(cron.find_command(command)))):
            return logger.warning(f"No '{command}' crons found")

        logger.warning(f"Cleaning up {crons_no} existing '{command}' crons")
        cron.remove_all(command=command)


def set_crons(crons: List[Cron], remove_all=True):
    logger.info(f"Setting crons")
    with CronTab(user=config("USERNAME")) as crontab:
        for i, cron in enumerate(crons):
            if remove_all:
                logger.warning("Clearing all existing crons")
                crontab.remove_all()
            cmd = crontab.new(command=cron.management_command)
            cmd.setall(cron.expression)
    logger.info(f"Set {i + 1} cron{'s' if i else ''}")
