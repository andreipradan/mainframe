from operator import attrgetter

from django.core.management import BaseCommand
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.devices import DevicesClient
from mainframe.clients.logs import get_default_logger
from mainframe.sources.models import Source
from telegram.constants import ParseMode


def should_notify(devices):
    return list(map(repr, filter(attrgetter("should_notify_presence"), devices)))


class Command(BaseCommand):
    def handle(self, *_, **options):
        logger = get_default_logger(__name__)
        client = DevicesClient(Source.objects.default(), logger=logger)
        new_devices, went_online, went_offline = client.run()
        msg = ""
        if new_devices := list(map(repr, new_devices)):
            msg += (
                f"⚠️ {len(new_devices)} new device{'s' if len(new_devices) > 1 else ''} "
                f"joined: {', '.join(new_devices)}"
            )
        if went_online := should_notify(went_online):
            msg += (
                f"\n🌝 {len(went_online)} device"
                f"{'s' if len(went_online) > 1 else ''} "
                f"went online: {', '.join(went_online)}"
            )
        if went_offline := should_notify(went_offline):
            msg += (
                f"\n🚪 {len(went_offline)} device"
                f"{'s' if len(went_offline) > 1 else ''} "
                f"went offline: {', '.join(went_offline)}"
            )

        if msg:
            send_telegram_message(msg, logger=logger, parse_mode=ParseMode.HTML)

        logger.info("Done")
        self.stdout.write(self.style.SUCCESS("Done"))
