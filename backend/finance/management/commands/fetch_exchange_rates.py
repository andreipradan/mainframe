import logging

from django.core.management.base import BaseCommand, CommandError

from clients import healthchecks
from clients.chat import send_telegram_message
from clients.logs import ManagementCommandsHandler
from finance.management.clients import (
    FetchExchangeRatesException,
    fetch_from_bnr,
    fetch_from_ecb,
)

clients = {
    "bnr": fetch_from_bnr,
    "ecb": fetch_from_ecb,
}


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            choices=["bnr", "ecb"],
            required=True,
            type=str,
        )

    def handle(self, *_, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        source = options["source"]
        logger.info(f"Fetching {source.upper()} exchange rates")
        healthchecks.ping(f"{source}-fx")

        try:
            date, count = clients[source](logger)
        except FetchExchangeRatesException as e:
            raise CommandError(e)

        msg = f"Fetched {count} {source.upper()} exchange rates for {date}"
        logger.info(msg)
        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS("Done."))
