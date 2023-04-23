import logging
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError

from bots.models import Bot
from clients.meals import MealsClient, FetchMealsException
from core.settings import get_file_handler

logger = logging.getLogger(__name__)
logger.addHandler(get_file_handler(Path(__file__).stem))


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger.info("Fetching menu for the next month")
        try:
            meals = MealsClient.fetch_meals()
        except FetchMealsException as e:
            raise CommandError(e)

        msg = f"Fetched {len(meals)} meals"
        logger.info(msg)
        bot = Bot.objects.get(additional_data__debug_chat_id__isnull=False)
        bot.send_message(chat_id=bot.additional_data["debug_chat_id"], text=msg)

        self.stdout.write(self.style.SUCCESS("Done."))
