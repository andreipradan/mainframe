from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.finance.payment import PaymentImportError, PaymentsImporter
from mainframe.clients.logs import get_default_logger

DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = get_default_logger(__name__, management=True)

        logger.info("Importing payments")

        total = 0
        data_path = settings.BASE_DIR / "finance" / "data" / "payments"
        failed_imports = []
        for file_name in Path(data_path).glob("**/*.pdf"):
            try:
                PaymentsImporter(file_name, logger).run()
            except PaymentImportError as e:
                logger.error(e)
                failed_imports.append(file_name.stem)
                continue
            else:
                total += 1

            file_name.unlink()

        msg = f"Imported payments from {total} files"
        if failed_imports:
            msg += f"\nFailed files: {', '.join(failed_imports)}"
            logger.error(msg)

        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS(msg))
