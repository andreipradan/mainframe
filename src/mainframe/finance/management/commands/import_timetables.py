from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.finance.timetable import TimetableImportError, import_timetable
from mainframe.clients.logs import get_default_logger


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = get_default_logger(__name__, management=True)

        logger.info("Importing timetable")

        total = 0
        data_path = settings.BASE_DIR / "finance" / "data" / "timetables"
        failed_imports = []
        for file_name in Path(data_path).glob("**/*.pdf"):
            try:
                import_timetable(file_name, logger=logger)
            except TimetableImportError as e:
                logger.error("Could not process file: %s - error: %s", file_name, e)
                failed_imports.append(file_name.stem)
                continue
            else:
                total += 1

            file_name.unlink()

        msg = f"Imported {total} timetables"
        if failed_imports:
            msg += f"\nFailed files: {', '.join(failed_imports)}"
            logger.error("Failed files: %s", ", ".join(failed_imports))

        send_telegram_message(text=msg)
        self.stdout.write(self.style.SUCCESS(msg))
