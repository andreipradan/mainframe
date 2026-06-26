import structlog
from django.core.management import BaseCommand, CommandError

from mainframe.events.tasks import get_band_concerts
from mainframe.sources.models import Source

logger = structlog.get_logger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        if not (bands := list(Source.objects.filter(is_active=True, type="band"))):
            raise CommandError("No favorite bands found in the dabatase")

        logger.info(
            "Deploying tasks to fetch concerts for all favorite bands...",
            bands_count=len(bands),
        )
        for band in bands:
            get_band_concerts(band)
