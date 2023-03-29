import logging

from crontab import CronTab


def remove_crons(command, logger=None):
    logger = logger or logging.getLogger(__name__)
    with CronTab(user="andreierdna") as cron:
        if not (crons_no := len(cron.find_command(command))):
            return logger.warning(f"No '{command}' crons found")

        logger.warning(f"Cleaning up {crons_no} existing '{command}' crons")
        cron.remove_all(command=command)


def set_cron(expression, command, logger=None):
    with CronTab(user="andreierdna") as cron:
        remove_crons(command, logger=logger)
        cmd = cron.new(command=command)
        cmd.setall(expression)
