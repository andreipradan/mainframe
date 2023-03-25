import json
import logging
import random
import time
from datetime import datetime, timedelta
from random import randrange

from crontab import CronTab
from django.conf import settings
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
    start = tomorrow.replace(hour=9, minute=30, second=0, microsecond=0)
    end = start + timedelta(hours=13)
    return start + timedelta(seconds=randrange((end - start).seconds))


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "--post-deploy",
            action="store_true",
            default=False,
            dest="post_deploy",
        )

    def handle(self, *args, **options):
        cron = CronTab(user="andreierdna")
        if (cmds_no := len(commands := list(cron.find_command("be_real")))) > 1:
            crons = "\n".join(commands)
            raise CommandError(f"Multiple 'be_real' crons found: {crons}")
        if cmds_no < 1:
            logger.info("No existing cron. Creating...")
            cmd = cron.new(command=COMMAND)
        else:
            cmd = commands[0]
            not cmd.enabled and cmd.enable() and logger.info("Enabling...")

        try:
            instance = Bot.objects.get(additional_data__be_real__isnull=False)
        except OperationalError as e:
            if options["post_deploy"] is True:
                cmd.minute = str(int(str(cmd.minute)) + 1)
                cron.write()
            raise CommandError(str(e))
        except Bot.DoesNotExist:
            raise CommandError("Bot with be_real config in additional_data missing")

        be_real = instance.additional_data["be_real"]
        if not isinstance(be_real, dict) or not (chat_id := be_real.get("chat_id")):
            raise CommandError("Missing chat_id from be_real config")

        if options["post_deploy"] is False:
            logger.info("It's time to take a picture...")
            data_path = settings.BASE_DIR / "bots" / "management" / "commands" / "data"
            with open(data_path / "saluturi.json", "r") as salut_file:
                salut = random.choice(json.load(salut_file))
            with open(data_path / "actions.json", "r") as actions_file:
                action = random.choice(json.load(actions_file))
            text = f"❗️📷 {salut} {action} 📷❗️"
            instance.send_message(chat_id=chat_id, text=text)
        else:
            logger.info("Initializing be_real...")
            if (next_run := (instance.additional_data["be_real"].get("next_run"))) and (
                next_run := (datetime.strptime(next_run, DATETIME_FORMAT))
            ) >= datetime.today():
                logger.info("Cron in future")
                logger.info(f"Now: {datetime.today()}")
                logger.info(f"Next run: {next_run}")
                cmd.setall(
                    f"{next_run.minute} {next_run.hour} {next_run.day} {next_run.month} *"
                )
                cron.write()
                return logger.info(f"Set cron to {next_run}")

        tomorrow_run = get_tomorrow_run().replace(second=0, microsecond=0)
        tomorrow_run_str = tomorrow_run.strftime(DATETIME_FORMAT)
        expression = f"{tomorrow_run.minute} {tomorrow_run.hour} {tomorrow_run.day} {tomorrow_run.month} *"
        cmd.setall(expression)
        cron.write()
        time.sleep(3)
        instance.additional_data["be_real"]["next_run"] = tomorrow_run_str
        instance.save()
        logger.info(f"Set next run and cron to {tomorrow_run_str}")

        return self.stdout.write(self.style.SUCCESS("Done."))
