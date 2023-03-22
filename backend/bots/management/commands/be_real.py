import logging
from datetime import datetime, timedelta
from random import randrange

import telegram
from django.core.management.base import BaseCommand, CommandError

from bots.models import Bot

logger = logging.getLogger(__name__)


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
            new_time = random_time()
            be_real["last_time"] = new_time.strftime("%Y-%m-%d %H:%M")
            bot.save()
            last_time = new_time
            logger.info("Done")
        else:
            logger.info("Time already set for today")

        logger.info("Checking if it's time...")

        if last_time.replace(second=0, microsecond=0) == datetime.today().replace(
            second=0, microsecond=0
        ):
            logger.info("It is! Sending notification!")
            telegram.Bot(bot.token).send_message(
                chat_id=chat_id,
                text="❗️📷 Ce faci? Bagă o poză acum 📷❗️",
            )
        else:
            logger.info(f"It's not.\n{last_time}\n{datetime.now()}")

        self.stdout.write(self.style.SUCCESS("Done."))
