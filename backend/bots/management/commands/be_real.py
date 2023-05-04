import json
import logging
import random
from datetime import datetime, timedelta
from pathlib import Path
from random import randrange

from django.conf import settings
from django.core.management.base import BaseCommand

from bots.models import Bot
from clients.cron import set_crons
from core.settings import get_file_handler
from crons.models import Cron

logger = logging.getLogger(__name__)
logger.addHandler(get_file_handler(Path(__file__).stem))


def get_tomorrow_run() -> datetime:
    tomorrow = datetime.today() + timedelta(days=1)
    start = tomorrow.replace(hour=9, minute=30, second=0, microsecond=0)
    end = start + timedelta(hours=13)
    return start + timedelta(seconds=randrange((end - start).seconds))


class Command(BaseCommand):
    def handle(self, *args, **options):
        instance = Bot.objects.get(additional_data__debug_chat_id__isnull=False)
        logger.info("It's time to take a picture...")
        data_path = settings.BASE_DIR / "bots" / "management" / "commands" / "data"

        with open(data_path / "saluturi.json", "r") as salut_file:
            salut = random.choice(json.load(salut_file))
        with open(data_path / "actions.json", "r") as actions_file:
            action = random.choice(json.load(actions_file))

        text = f"❗️📷 {salut} {action} 📷❗️"
        instance.send_message(chat_id=instance.additional_data['be_real_chat_id'], text=text)

        tomorrow_run = get_tomorrow_run().replace(second=0, microsecond=0)
        expression = f"{tomorrow_run.minute} {tomorrow_run.hour} {tomorrow_run.day} {tomorrow_run.month} *"
        cron = Cron(
            command=f"be_real",
            expression=expression,
            is_active=True,
            is_management=True,
        )
        set_crons([cron])
        logger.info(f"Set next run and cron to {tomorrow_run.strftime('%H:%M %d.%m.%Y')}")

        return self.stdout.write(self.style.SUCCESS("Done."))
