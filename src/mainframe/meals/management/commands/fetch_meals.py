from django.core.management.base import BaseCommand, CommandError
from mainframe.clients import healthchecks
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.logs import get_default_logger
from mainframe.clients.meals import FetchMealsException, MealsClient


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = get_default_logger(__name__, management=True)

        logger.info("Fetching menu for the next month")
        healthchecks.ping("meals")
        try:
            meals = MealsClient.fetch_meals()
        except FetchMealsException as e:
            raise CommandError(e) from e

        msg = f"Fetched {len(meals)} meals"
        logger.info(msg)
        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS("Done."))
