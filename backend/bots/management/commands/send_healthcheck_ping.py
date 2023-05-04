import environ
import requests
from django.core.management.base import BaseCommand, CommandError
from requests import HTTPError


class Command(BaseCommand):
    def handle(self, *args, **options):
        config = environ.Env()
        response = requests.post(url=config("HEALTHCHECKS_URL"))
        try:
            response.raise_for_status()
        except HTTPError as e:
            raise CommandError(e)
        self.stdout.write(self.style.SUCCESS(f"Done. [{response.text}]"))
