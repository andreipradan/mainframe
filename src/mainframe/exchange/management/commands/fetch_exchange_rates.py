import logging

from django.core.management.base import BaseCommand, CommandError
from mainframe.clients import healthchecks
from mainframe.clients.logs import ManagementCommandsHandler
from mainframe.exchange.management.clients import BNR, ECB, FetchExchangeRatesException

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
        logger.info("Fetching %s exchange rates", source.upper())
        healthchecks.ping(f"{source}-fx")

        try:
            count = CLIENTS[source](logger).fetch(full=options["full"])
        except FetchExchangeRatesException as e:
            raise CommandError(e) from e

        msg = f"Fetched {count} {source.upper()} exchange rates"
        logger.info(msg)
        self.stdout.write(self.style.SUCCESS("Done."))