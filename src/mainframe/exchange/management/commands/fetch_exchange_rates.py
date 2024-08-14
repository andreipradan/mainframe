from django.core.management.base import BaseCommand, CommandError
from mainframe.clients import healthchecks
from mainframe.clients.logs import get_default_logger
from mainframe.exchange.management.clients import (BNR, ECB,
                                                   FetchExchangeRatesException)

CLIENTS = {"bnr": BNR, "ecb": ECB}

logger = get_default_logger(__name__)


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
        source = options["source"]
        logger.info("Fetching %s exchange rates", source.upper())
        healthchecks.ping(logger, f"{source}-fx")

        try:
            count = CLIENTS[source](logger).fetch(full=options["full"])
        except FetchExchangeRatesException as e:
            raise CommandError(e) from e

        logger.info("Fetched %s %s exchange rates", source.upper(), count)
        self.stdout.write(self.style.SUCCESS("Done."))
