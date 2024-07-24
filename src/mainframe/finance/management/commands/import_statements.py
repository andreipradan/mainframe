from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.finance.statement import StatementImportError, import_statement
from mainframe.clients.logs import get_default_logger


class Command(BaseCommand):
    def handle(self, *_, **options):
        logger = get_default_logger(__name__, management=True)

        logger.info("Importing statements")

        total = 0
        data_path = settings.BASE_DIR / "finance" / "data" / "statements"
        failed_imports = []

        for file_name in Path(data_path).glob("**/*.*"):
            logger.info("Parsing %s", file_name.name)
            try:
                import_statement(file_name, logger)
            except StatementImportError as e:
                logger.error(e)
                failed_imports.append(file_name.stem)
                continue
            else:
                total += 1

            file_name.unlink()

        msg = f"Imported transactions from {total} files"
        if failed_imports:
            msg += f"\nFailed files: {', '.join(failed_imports)}"
            logger.error("\nFailed files: %s", ", ".join(failed_imports))

        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS(msg))
