import json
import random
from datetime import datetime, timedelta
from random import randrange

import environ
from django.conf import settings
from django.core.management.base import BaseCommand
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.logs import get_default_logger
from mainframe.crons.models import Cron


def get_tomorrow_run() -> datetime:
    tomorrow = datetime.today() + timedelta(days=1)
    start = tomorrow.replace(hour=9, minute=30, second=0, microsecond=0)
    end = start + timedelta(hours=13)
    return start + timedelta(seconds=randrange((end - start).seconds))  # noqa: S311


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = get_default_logger(__name__)

        config = environ.Env()
        logger.info("It's time to take a picture...")
        data_path = settings.BASE_DIR / "bots" / "management" / "commands" / "data"

        with open(data_path / "saluturi.json", "r") as salut_file:
            salut = random.choice(json.load(salut_file))  # noqa: S311
        with open(data_path / "actions.json", "r") as actions_file:
            action = random.choice(json.load(actions_file))  # noqa: S311

        text = f"❗️📷 {salut} {action} 📷❗️"
        send_telegram_message(
            chat_id=config("BE_REAL_CHAT_ID"),
            text=text,
            disable_notification=False,
        )

        tomorrow_run = get_tomorrow_run().replace(second=0, microsecond=0)
        expression = (
            f"{tomorrow_run.minute} {tomorrow_run.hour} "
            f"{tomorrow_run.day} {tomorrow_run.month} *"
        )
        Cron.objects.update_or_create(
            command="be_real", defaults={"expression": expression}
        )

        logger.info(
            "Set next run and cron to %s", tomorrow_run.strftime("%H:%M %d.%m.%Y")
        )

        return self.stdout.write(self.style.SUCCESS("Done."))
