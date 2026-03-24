import logging

from django.core.management import BaseCommand, CommandError

from mainframe.clients.events.eb import EBClient

logger = logging.getLogger(__name__)

CATEGORIES = {
    "music": 1,
    "sport": 2,
    "film": 3,
    "other": 4,
    "theater": 5,
    "online": 6,
}


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "category",
            type=str,
            choices=CATEGORIES.keys(),
            help="Category of events to fetch",
        )
        parser.add_argument("--api-url", type=str, required=True)

    def handle(self, *args, **options):
        category = options["category"]
        api_url = options["api_url"]

        category_id = CATEGORIES.get(category)
        if not category_id:
            raise CommandError(f"Invalid category: {category}")

        self.stdout.write(
            f"Fetching {category} events from {api_url} (category_id: {category_id})..."
        )

        client = EBClient(api_url)
        try:
            client.fetch_events(category_id=category_id)
            self.stdout.write(
                self.style.SUCCESS(f"Successfully fetched {category} events from EB")
            )
        except Exception as e:
            logger.error("Failed to fetch events: %s", e)
            raise CommandError(f"Failed to fetch events: {e}") from e
