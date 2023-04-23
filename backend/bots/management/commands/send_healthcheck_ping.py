import logging
from pathlib import Path

import environ
import requests
from django.core.management.base import BaseCommand, CommandError
from requests import HTTPError

from core.settings import get_file_handler

logger = logging.getLogger(__name__)
logger.addHandler(get_file_handler(Path(__file__).stem))


class Command(BaseCommand):
    def handle(self, *args, **options):
        config = environ.Env()
        logger.info(f"Sending healthcheck ping")
        response = requests.post(url=config("HEALTHCHECKS_URL"))
        try:
            response.raise_for_status()
        except HTTPError as e:
            raise CommandError(e)
        self.stdout.write(self.style.SUCCESS(f"Done. [{response.text}]"))
