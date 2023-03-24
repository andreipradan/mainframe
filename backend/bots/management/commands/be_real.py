import logging
from datetime import datetime, timedelta
from random import randrange

from crontab import CronTab
from django.core.management.base import BaseCommand, CommandError
from django.db import OperationalError

from bots.models import Bot

logger = logging.getLogger(__name__)

DATETIME_FORMAT = "%H:%M %d.%m.%Y"
PATH = "/var/log/mainframe/crons/be-real/"
COMMAND = (
    f"mkdir -p {PATH}`date +%Y` && "
    "$HOME/.virtualenvs/mainframe/bin/python $HOME/projects/mainframe/backend/manage.py be_real >> "
    f"{PATH}`date +%Y`/`date +%Y-%m`.log 2>&1"
)


def get_tomorrow_run() -> datetime:
    tomorrow = datetime.today() + timedelta(days=1)
    start = tomorrow.replace(hour=7, minute=30, second=0, microsecond=0)
    end = start + timedelta(hours=14)
    return start + timedelta(seconds=randrange((end - start).seconds))


def set_cron(instance):
    with CronTab(user="andreierdna") as cron:
        if (cmds_no := len(commands := list(cron.find_command("be_real")))) > 1:
            crons = "\n".join(commands)
            raise CommandError(f"Multiple 'be_real' crons found: {crons}")

        if cmds_no < 1:
            logger.info("No existing cron. Creating...")
            cmd = cron.new(command=COMMAND)
        else:
            cmd = commands[0]
            not cmd.enabled and cmd.enable() and logger.info("Disabled. Enabling...")

        tomorrow_run = get_tomorrow_run().replace(second=0, microsecond=0)
        expression = f"{tomorrow_run.minute} {tomorrow_run.hour} {tomorrow_run.day} {tomorrow_run.month} *"

        be_real = instance.additional_data["be_real"]
        if (next_run := (be_real.get("next_run"))) and (
            next_run := datetime.strptime(next_run, DATETIME_FORMAT)
        ) > datetime.today():
            expression = (
                f"{next_run.minute} {next_run.hour} {next_run.day} {next_run.month} *"
            )
            logger.info(f"Cron in future\nnext: {next_run}\nnow: {datetime.today()}")
        else:
            next_run_str = tomorrow_run.strftime(DATETIME_FORMAT)
            instance.additional_data["be_real"]["next_run"] = next_run_str
            instance.save()
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
        try:
            instance = Bot.objects.get(additional_data__be_real__isnull=False)
        except OperationalError as e:
            raise CommandError(str(e))
        except Bot.DoesNotExist:
            raise CommandError(
                "Bot with be_real config in additional_data does not exist"
            )

        be_real = instance.additional_data["be_real"]
        if not isinstance(be_real, dict) or not (chat_id := be_real.get("chat_id")):
            raise CommandError("chat_id missing from be_real in bot additional data")

        if options["post_deploy"] is True:
            logger.info("Initializing be_real...")
        else:
            logger.info("It's time to take a picture...")
            text = "❗️📷 Ce faci? Bagă o poză acum 📷❗️"
            instance.send_message(chat_id=chat_id, text=text)

        set_cron(instance)
        return self.stdout.write(self.style.SUCCESS("Done."))
