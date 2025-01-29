import logging

from django.core.management.base import BaseCommand, CommandError
from mainframe.clients import healthchecks
from mainframe.clients.meals import FetchMealsException, MealsClient


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = logging.getLogger(__name__)

        logger.info("Fetching menu for the next month")
        healthchecks.ping(logger, "meals")
        try:
            meals = MealsClient.fetch_meals()
        except FetchMealsException as e:
            raise CommandError(e) from e

        logger.info("Fetched %d meals", len(meals))
        self.stdout.write(self.style.SUCCESS("Done."))
