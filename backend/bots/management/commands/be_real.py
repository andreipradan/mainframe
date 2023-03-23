import logging
from datetime import datetime, timedelta
from random import randrange

from crontab import CronTab
from django.core.management.base import BaseCommand, CommandError
from django.db import OperationalError

from bots.models import Bot

logger = logging.getLogger(__name__)

PATH = "/var/log/mainframe/crons/be-real/"
COMMAND = (
    f"mkdir -p {PATH}`date +\%Y` && "
    "$HOME/.virtualenvs/mainframe/bin/python $HOME/projects/mainframe/backend/manage.py be_real >> "
    f"{PATH}`date +\%Y`/`date +\%Y-\%m`.log 2>&1"
)


def random_time() -> datetime:
    tomorrow = datetime.today() + timedelta(days=1)
    start = tomorrow.replace(hour=7, minute=30, second=0, microsecond=0)
    end = start + timedelta(hours=14)
    return start + timedelta(seconds=randrange((end - start).seconds))


def set_cron():
    logger.info("Setting cron for the next run...")
    next_run = random_time().replace(second=0, microsecond=0)
    expression = f"{next_run.minute} {next_run.hour} {next_run.day} {next_run.month} *"

    with CronTab(user="andreierdna") as cron:
        if (cmds_no := len(commands := list(cron.find_command("be_real")))) > 1:
            crons = "\n".join(commands)
            raise CommandError(f"Multiple 'be_real' crons found: {crons}")
        elif cmds_no < 1:
            logger.info("No existing cron. Creating new.")
            cmd = cron.new(command=COMMAND)
        else:
            cmd = commands[0]
            now = datetime.today()
            date_string = f"{cmd.minute}:{cmd.hour} {now.year}-{cmd.month}-{cmd.day}"
            if datetime.strptime(date_string, "%M:%H %Y-%m-%d") >= now:
                logger.info("Cron in future")
                if cmd.enabled:
                    return logger.info("Skip")
                logger.info("Disabled. Enabling...")
                cmd.enable(True)
                return logger.info("Done")

        cmd.setall(expression)
    logger.info(f"Cron set: {expression}")


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "--post-deploy",
            action="store_true",
            default=False,
            dest="post_deploy",
        )

    def handle(self, *args, **options):
        if options["post_deploy"] is True:
            logger.info("Initializing be_real...")
            set_cron()
            return self.stdout.write(self.style.SUCCESS("Done."))

        logger.info("It's time to take a picture...")

        try:
            bot = Bot.objects.get(additional_data__be_real__isnull=False)
        except OperationalError as e:
            raise CommandError(str(e))
        except Bot.DoesNotExist:
            raise CommandError(
                "Bot with be_real config in additional_data does not exist"
            )

        be_real = bot.additional_data["be_real"]
        if not isinstance(be_real, dict) or not (chat_id := be_real.get("chat_id")):
            raise CommandError("chat_id missing from be_real in bot additional data")

        text = "❗️📷 Ce faci? Bagă o poză acum 📷❗️"
        bot.send_message(chat_id=chat_id, text=text)
        set_cron()
        self.stdout.write(self.style.SUCCESS("Done."))
