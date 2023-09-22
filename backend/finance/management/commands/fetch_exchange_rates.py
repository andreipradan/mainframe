import logging
from django.core.management.base import BaseCommand, CommandError

from clients import healthchecks
from clients.logs import ManagementCommandsHandler
from clients.bnr import fetch_exchange_rates, FetchExchangeRatesException
from clients.chat import send_telegram_message


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        logger.info("Fetching exchange rates")
        healthchecks.ping("exchange-rates")

        try:
            date, count = fetch_exchange_rates(logger)
        except FetchExchangeRatesException as e:
            raise CommandError(e)

        msg = f"Fetched {count} exchange rates for {date}"
        logger.info(msg)
        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS("Done."))
