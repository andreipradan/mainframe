import asyncio
import logging
from operator import attrgetter

from django.core.management import BaseCommand
from telegram.constants import ParseMode

from mainframe.clients import healthchecks
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.devices import DevicesClient
from mainframe.sources.models import Source

logger = logging.getLogger(__name__)


def should_notify(devices):
    return list(map(str, filter(attrgetter("should_notify_presence"), devices)))


class Command(BaseCommand):
    def handle(self, *_, **options):
        """
        Execute the management command: query device state, build and send a Telegram notification for notable changes, and ping the "devices" healthcheck.
        
        Creates a DevicesClient, obtains lists of newly seen devices and devices that went online or offline, filters those lists via should_notify, and constructs a human-readable message (counts, pluralization, and device names with emoji prefixes). If any noteworthy changes exist, sends the message to Telegram (using asyncio.run to call send_telegram_message with HTML parse mode). Logs completion and pings the "devices" healthcheck; the health ping is performed only after successful command execution (it will not run if an exception is raised earlier).
        """
        client = DevicesClient(Source.objects.default(), logger=logger)
        new_devices, went_online, went_offline = client.run()
        msg = ""
        if new_devices := should_notify(new_devices):
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
            asyncio.run(
                send_telegram_message(msg, logger=logger, parse_mode=ParseMode.HTML)
            )

        logger.info("Done")
        healthchecks.ping(logger, "devices")
