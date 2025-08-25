import logging

from django.core.management.base import BaseCommand, CommandError

from mainframe.clients import healthchecks
from mainframe.clients.meals import FetchMealsException, MealsClient


class Command(BaseCommand):
    def handle(self, *_, **__):
        """
        Execute the management command: fetch the next month's meals, report success, and ping healthchecks.
        
        Attempts to fetch meals via MealsClient.fetch_meals(). On success, logs the count of meals fetched, writes a success message to stdout, and calls healthchecks.ping(logger, "meals"). If fetching fails with FetchMealsException, re-raises it as a Django CommandError (preserving the original exception).
        
        Side effects:
        - Logs informational messages.
        - Writes to the command's stdout.
        - Sends a healthcheck ping only on successful fetch.
        
        Raises:
            CommandError: if MealsClient.fetch_meals() raises FetchMealsException.
        """
        logger = logging.getLogger(__name__)

        logger.info("Fetching menu for the next month")
        try:
            meals = MealsClient.fetch_meals()
        except FetchMealsException as e:
            raise CommandError(e) from e

        logger.info("Fetched %d meals", len(meals))
        self.stdout.write(self.style.SUCCESS("Done."))
        healthchecks.ping(logger, "meals")
