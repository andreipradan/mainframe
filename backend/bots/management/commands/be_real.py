import logging
from datetime import datetime, timedelta
from random import randrange

from crontab import CronTab
from django.core.management.base import BaseCommand, CommandError

from bots.models import Bot

logger = logging.getLogger(__name__)


def post_deploy():
    logger.info(f"Getting be_real cron...")
    with CronTab(user="andreierdna") as cron:
        commands = cron.find_command("be_real")
        if cmds_no := (len(commands := list(commands))) > 1:
            crons = "\n".join(commands)
            raise CommandError(f"Multiple 'be_real' crons found: {crons}")
        elif not cmds_no:
            logger.info("No cron, setting...")
            set_cron()
        elif cmds_no == 1:
            cmd = commands[0]
            now = datetime.today()
            date_string = f"{cmd.minute}:{cmd.hour} {now.year}-{cmd.month}-{cmd.day}"
            if datetime.strptime(date_string, "%M:%H %Y-%m-%d") < now:
                logger.info("Cron in the past, updating...")
                set_cron()


def random_time() -> datetime:
    tomorrow = datetime.today() + timedelta(days=1)
    start = tomorrow.replace(hour=7, minute=30, second=0, microsecond=0)
    end = start + timedelta(hours=14)
    return start + timedelta(seconds=randrange((end - start).seconds))


def set_cron():
    logger.info("Updating cron with the next run...")
    next_run = random_time().replace(second=0, microsecond=0)
    expression = f"{next_run.minute} {next_run.hour} {next_run.day} {next_run.month} *"

    with CronTab(user="andreierdna") as cron:
        commands = cron.find_command("be_real")
        if (cmds_no := len(commands := list(commands))) != 1:
            raise CommandError(
                f"Only 1 cron with 'be_real' term must exist, found: {cmds_no}"
            )
        command = commands[0]
        command.setall(expression)
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
