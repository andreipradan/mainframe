import logging
from datetime import datetime, timedelta
from random import randrange

from crontab import CronTab
from django.core.management.base import BaseCommand, CommandError

from bots.models import Bot

logger = logging.getLogger(__name__)


def set_cron(expression):
    logger.info(f"Setting be_real cron expression '{expression}'")
    with CronTab(user="andreierdna") as cron:
        commands = cron.find_command("be_real")
        if cmds_no := (len(commands := list(commands))) != 1:
            raise CommandError(
                f"Only 1 cron with 'be_real' term must exist, found: {cmds_no}"
            )
        command = commands[0]
        command.set_all(expression)
    logger.info("Cron set.")


def random_time() -> datetime:
    start = datetime.today().replace(hour=7, minute=30, second=0, microsecond=0)
    end = start + timedelta(hours=14)
    return start + timedelta(seconds=randrange((end - start).seconds))


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger.info("Checking if it's time to take a picture...")

        try:
            bot = Bot.objects.get(additional_data__be_real__isnull=False)
        except Bot.DoesNotExist:
            raise CommandError(
                "Bot with be_real config in additional_data does not exist"
            )

        be_real = bot.additional_data["be_real"]
        if not isinstance(be_real, dict) or not (chat_id := be_real.get("chat_id")):
            raise CommandError("chat_id missing from be_real in bot additional data")
        if (
            not (last_time := be_real.get("last_time"))
            or (last_time := datetime.strptime(last_time, "%Y-%m-%d %H:%M")).date()
            != datetime.today().date()
        ):
            logger.warning("No trigger time set for today. Setting...")
            last_time = random_time().replace(second=0, microsecond=0)
            be_real["last_time"] = last_time.strftime("%Y-%m-%d %H:%M")
            bot.save()
            logger.info("Done")
        else:
            logger.info("Time already set for today")

        logger.info("Checking if it's time...")

        now = datetime.today().replace(second=0, microsecond=0)
        tomorrow = now + timedelta(days=1)
        if last_time > now:
            logger.info(f"Not yet\n{last_time}\n{now}")
        else:
            if last_time == now:
                logger.info("It is! Sending notification!")
                text = "❗️📷 Ce faci? Bagă o poză acum 📷❗️"
                bot.send_message(chat_id=chat_id, text=text)
            logger.info("Updating cron to run starting tomorrow.")
            set_cron(f"* 07-21 {tomorrow.day} {tomorrow.month} *")

        self.stdout.write(self.style.SUCCESS("Done."))
