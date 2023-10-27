import logging

from django.core.management.base import BaseCommand, CommandError

from clients import healthchecks
from clients.chat import send_telegram_message
from clients.logs import ManagementCommandsHandler
from exchange.management.clients import BNR, ECB, FetchExchangeRatesException

CLIENTS = {"bnr": BNR, "ecb": ECB}


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            choices=["bnr", "ecb"],
            required=True,
            type=str,
        )
        parser.add_argument(
            "--full",
            action="store_true",
            default=False,
        )

    def handle(self, *_, **options):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())

        source = options["source"]
        logger.info(f"Fetching {source.upper()} exchange rates")
        healthchecks.ping(f"{source}-fx")

        try:
            count = CLIENTS[source](logger).fetch(full=options["full"])
        except FetchExchangeRatesException as e:
            raise CommandError(e)

        msg = f"Fetched {count} {source.upper()} exchange rates"
        logger.info(msg)
        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS("Done."))
