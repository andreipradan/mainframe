import asyncio
import logging

from asgiref.sync import sync_to_async
from django.core.management.base import BaseCommand, CommandError

from mainframe.clients import healthchecks
from mainframe.clients.ctp import CTPClient, FetchTransitLinesException
from mainframe.transit_lines.models import TransitLine

DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"


class Command(BaseCommand):
    def handle(self, *_, **__):
        asyncio.run(self.handle_async())

    async def handle_async(self):
        """
        Asynchronously import transit lines and schedules from the CTP client, persist them with conflict resolution, and report success.
        
        Performs the full import workflow:
        - Fetches transit lines for each line type defined in TransitLine.LINE_TYPE_CHOICES via CTPClient (lines fetched with commit=False).
        - Persists all fetched TransitLine instances using bulk_create with conflict resolution (updates: car_type, line_type, terminal1, terminal2; uniqueness by name).
        - Fetches schedules from the CTP client (commit=True).
        - Logs and writes a success message containing the number of synced lines and schedules.
        - Pings the "transit" healthcheck on successful completion.
        
        Side effects:
        - Persists/updates TransitLine rows in the database.
        - Writes a success message to stdout and logs progress.
        - Calls healthchecks.ping(logger, "transit").
        
        Raises:
        - CommandError if fetching lines raises FetchTransitLinesException.
        """
        logger = logging.getLogger(__name__)

        logger.info("Importing transit lines")

        lines = []
        client = CTPClient(logger=logger)
        for line_type in [c[0] for c in TransitLine.LINE_TYPE_CHOICES]:
            try:
                lines.extend(client.fetch_lines(line_type, commit=False))
            except FetchTransitLinesException as e:
                raise CommandError(e) from e

        await sync_to_async(TransitLine.objects.bulk_create)(
            lines,
            update_conflicts=True,
            update_fields=["car_type", "line_type", "terminal1", "terminal2"],
            unique_fields=["name"],
        )

        schedules = list(await client.fetch_schedules(commit=True))

        msg = f"Synced {len(lines)} transit lines and {len(schedules)} schedules"
        logger.info(msg)
        self.stdout.write(self.style.SUCCESS(msg))
        healthchecks.ping(logger, "transit")
