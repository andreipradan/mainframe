import logging

from django.core.management.base import BaseCommand, CommandError

from mainframe.clients import healthchecks
from mainframe.exchange.management.clients import BNR, ECB, FetchExchangeRatesException

CLIENTS = {"bnr": BNR, "ecb": ECB}

logger = logging.getLogger(__name__)


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
        """
        Execute the management command: fetch exchange rates from the specified source, output progress, and ping healthchecks on success.

        Detailed behavior:
        - Reads 'source' and 'full' from the provided options.
        - Instantiates the client for the chosen source and calls its fetch(full=options["full"]).
        - Logs start and completion messages and writes "Done." to stdout on success.
        - Sends a healthchecks.ping with the target label "{source}-fx" only after a successful fetch.

        Options (in `options`):
        - source (str): Exchange source identifier, expected to be 'bnr' or 'ecb'.
        - full (bool): When True, perform a full data retrieval; otherwise perform an incremental/partial fetch.

        Raises:
        - CommandError: If the underlying client raises FetchExchangeRatesException, it is converted to a CommandError while preserving the original exception context.
        """
        source = options["source"]
        logger.info("Fetching %s exchange rates", source.upper())

        try:
            count = CLIENTS[source](logger).fetch(full=options["full"])
        except FetchExchangeRatesException as e:
            raise CommandError(e) from e

        logger.info("Fetched %s %s exchange rates", source.upper(), count)
        self.stdout.write(self.style.SUCCESS("Done."))
        healthchecks.ping(logger, f"{source}-fx")
