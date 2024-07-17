from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.finance.payment import PaymentsImporter
from mainframe.clients.logs import get_default_logger

DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = get_default_logger(__name__, management=True)

        logger.info("Importing payments")

        total = 0
        data_path = settings.BASE_DIR / "finance" / "data" / "payments"
        for file_name in Path(data_path).glob("**/*.pdf"):
            total += len(PaymentsImporter(file_name, logger).run())

        msg = f"Imported {total} payments"
        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS(msg))
