import logging
from django.core.management.base import BaseCommand, CommandError

from clients.logs import get_handler
from clients.meals import MealsClient, FetchMealsException
from clients.chat import send_telegram_message


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(get_handler("management"))

        logger.info("Fetching menu for the next month")
        try:
            meals = MealsClient.fetch_meals()
        except FetchMealsException as e:
            raise CommandError(e)

        msg = f"Fetched {len(meals)} meals"
        logger.info(msg)
        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS("Done."))
