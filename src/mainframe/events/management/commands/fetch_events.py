import structlog
from django.core.management import BaseCommand, CommandError

from mainframe.clients.events.eb import EBClient
from mainframe.sources.models import Source

logger = structlog.get_logger(__name__)

CATEGORIES = {
    "music": 1,
    "sport": 2,
    "film": 3,
    "other": 4,
    "theater": 5,
    "online": 6,
}
CLIENT_MAPPING = {
    "eb": EBClient,
}


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "--category",
            choices=list(CATEGORIES),
            default="other",
            type=str,
        )
        parser.add_argument("--source", type=str, required=True)

    def handle(self, *args, **options):
        category = options["category"]
        source = options["source"].lower().strip()

        category_id = CATEGORIES.get(category)
        if not category_id:
            raise CommandError(f"Invalid category: {category}")

        try:
            source = Source.objects.get(name__iexact=source)
        except Source.DoesNotExist as e:
            raise CommandError(f"Source '{source}' not found") from e

        self.stdout.write(f"[{source}] Fetching {category} events...")

        client_class = CLIENT_MAPPING.get(source.name)
        if not client_class:
            raise CommandError(f"No client found for source '{source.name}'") from None

        client = client_class(source)
        try:
            client.fetch_events(category_id=category_id)
            self.stdout.write(
                self.style.SUCCESS(f"Successfully fetched {category} events from EB")
            )
        except Exception as e:
            logger.error("Failed to fetch events", error=str(e))
            raise CommandError(f"Failed to fetch events: {e}") from e
