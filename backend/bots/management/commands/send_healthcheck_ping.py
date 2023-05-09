from django.core.management.base import BaseCommand, CommandError
from requests import HTTPError

from clients import healthchecks


class Command(BaseCommand):
    def handle(self, *args, **options):
        try:
            response = healthchecks.ping()
        except HTTPError as e:
            raise CommandError(e)
        self.stdout.write(self.style.SUCCESS(f"[Healthcheck] Done. [{response.text}]"))
