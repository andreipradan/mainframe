import logging
from datetime import datetime, timedelta
from typing import List

import environ
from crontab import CronTab
from django.conf import settings

from clients.logs import MainframeHandler
from crons.models import Cron

config = environ.Env()
logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


def delay(command, minutes=1, is_management=True):
    n = datetime.now() + timedelta(minutes=minutes)
    expression = f"{n.minute} {n.hour} {n.day} {n.month} {n.weekday()}"
    set_crons(
        [
            Cron(
                command=command,
                expression=expression,
                is_active=True,
                is_management=is_management,
            )
        ]
    )


def get_all_crons() -> List[Cron]:
    with CronTab(user=config("USERNAME")) as crontab:
        manage_path = str(settings.BASE_DIR / "manage.py")
        return [
            Cron(
                command=Cron.unparse(cron.command),
                expression=str(cron.slices),
                is_active=cron.enabled,
                is_management=manage_path in cron.command,
                description=cron.comment,
            )
            for cron in crontab
        ]


def remove_crons_for_command(cron: Cron) -> None:
    with CronTab(user=config("USERNAME")) as crontab:
        command = cron.management_command if cron.is_management else cron.command
        if not (crons_no := len(list(crontab.find_command(command)))):
            return logger.warning("No '%s' crons found", cron)

        logger.info("Cleaning up %d existing '%s' crons", crons_no, cron)
        crontab.remove_all(command=command)


def set_crons(crons: List[Cron], clear_all=False, replace=True):
    with CronTab(user=config("USERNAME")) as crontab:
        if clear_all:
            logger.warning("Clearing all existing crons")
            crontab.remove_all()
        for cron in crons:
            command = cron.management_command if cron.is_management else cron.command
            not clear_all and replace and crontab.remove_all(command=command)
            cmd = crontab.new(command=command)
            cmd.setall(cron.expression)
            cmd.enable(cron.is_active)
            cmd.set_comment(cron.description)
    total_crons = len(crons)
    logger.info("Set %d cron%s ✅", total_crons, "s" if total_crons > 1 else "")
