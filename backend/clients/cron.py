import logging

from crontab import CronTab


def set_cron(expression, command, logger=None):
    logger = logger or logging.getLogger(__name__)
    with CronTab(user="andreierdna") as cron:
        if len(commands := list(cron.find_command(command))) > 1:
            crons = "\n".join(map(str, commands))
            logger.warning(f"Existing '{command}' crons found: {crons}, removing")
            cron.remove_all(command=command)

        cmd = cron.new(command=command)
        cmd.setall(expression)
