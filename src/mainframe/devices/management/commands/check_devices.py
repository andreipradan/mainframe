from django.core.management import BaseCommand
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.devices import DevicesClient
from mainframe.clients.logs import get_default_logger
from mainframe.sources.models import Source


class Command(BaseCommand):
    def handle(self, *_, **options):
        logger = get_default_logger(__name__, management=True)
        client = DevicesClient(Source.objects.default(), logger=logger)
        if new_macs := client.run(check=True):
            send_telegram_message(
                f"⚠️ New macs found on the network: {', '.join(new_macs)}", logger=logger
            )
        logger.info("Done")
        self.stdout.write(self.style.SUCCESS("Done"))
