import logging

from django.core.management import BaseCommand, CommandError

from mainframe.clients.events import EBClient, IBClient, ZnClient
from mainframe.events.constants import CATEGORY_ID_BY_NAME
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
            choices=list(CATEGORY_ID_BY_NAME.keys()),
            type=str,
        )
        parser.add_argument("--source", type=str, required=True)

    def handle(self, *args, **options):
        category = options["category"]
        source = options["source"].lower().strip()

        kwargs = {}

        try:
            source = Source.objects.get(name__iexact=source)
        except Source.DoesNotExist as e:
            raise CommandError(f"Source '{source}' not found") from e

        if source.name.lower() == "eb" and not category:
            raise CommandError("Category is required for source 'eb'")

        if category:
            if not (category_id := CATEGORY_ID_BY_NAME.get(category)):
                raise CommandError(f"Invalid category: {category}")
            kwargs["category_id"] = category_id

        self.stdout.write(
            f"[events][{source}] Fetching {f'{category} ' if category else ''}events..."
        )

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
                    "category",
                    "location",
                    "start_date",
                    "url",
                    "additional_data",
                    "city",
                    "description",
                    "end_date",
                    "external_id",
                    "location_url",
                    "updated_at",
                ],
                unique_fields=["url"],
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"[events][{source.name}] Successfully fetched and saved "
                    f"{len(events_to_create)} {f'{category} ' if category else ''}"
                    f"events"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"[events][{source.name}] "
                    f"No {f'{category} ' if category else ''}events found"
                )
            )
