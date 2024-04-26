import logging

from django.core.management.base import BaseCommand, CommandError

from clients import healthchecks
from clients.chat import send_telegram_message
from clients.logs import ManagementCommandsHandler
from clients.meals import FetchMealsException, MealsClient


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        logger.info("Fetching menu for the next month")
        healthchecks.ping("meals")
        try:
            meals = MealsClient.fetch_meals()
        except FetchMealsException as e:
            raise CommandError(e)

        msg = f"Fetched {len(meals)} meals"
        logger.info(msg)
        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS("Done."))
