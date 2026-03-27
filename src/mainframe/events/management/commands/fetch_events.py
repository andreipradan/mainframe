import logging

from django.core.management import BaseCommand, CommandError

from mainframe.clients.events import EBClient, IBClient, ZnClient
from mainframe.events.constants import CATEGORY_BY_NAME
from mainframe.events.models import Event
from mainframe.sources.models import Source

logger = logging.getLogger(__name__)

CLIENT_MAPPING = {
    "eb": EBClient,
    "ib": IBClient,
    "zn": ZnClient,
}


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "--category",
            choices=list(CATEGORY_BY_NAME.keys()),
            type=str,
        )
        parser.add_argument("--source", type=str, required=True)

    def handle(self, *args, **options):
        category = options["category"]
        source = options["source"].lower().strip()

        kwargs = {}
        category_id = CATEGORY_BY_NAME.get(category)
        if category_id:
            kwargs["category_id"] = category_id

        try:
            source = Source.objects.get(name__iexact=source)
        except Source.DoesNotExist as e:
            raise CommandError(f"Source '{source}' not found") from e

        self.stdout.write(f"[{source}] Fetching {category} events...")

        client_class = CLIENT_MAPPING.get(source.name.lower())
        if not client_class:
            raise CommandError(f"No client found for source '{source.name}'") from None

        client = client_class(source)
        events_to_create = client.fetch_events(**kwargs)
        if events_to_create:
            Event.objects.bulk_create(
                events_to_create,
                update_conflicts=True,
                update_fields=[
                    "title",
                    "description",
                    "start_date",
                    "end_date",
                    "location",
                    "location_slug",
                    "city_name",
                    "city_slug",
                    "url",
                    "additional_data",
                    "updated_at",
                ],
                unique_fields=["source", "external_id"],
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"[events][{source.name}] Successfully fetched and saved "
                    f"{len(events_to_create)} '{category}' events"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"[events][{source.name}] No valid '{category}' events found"
                )
            )
