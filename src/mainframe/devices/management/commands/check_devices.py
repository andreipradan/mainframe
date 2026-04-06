import asyncio
from operator import attrgetter

import structlog
from django.core.management import BaseCommand
from telegram.constants import ParseMode

from mainframe.clients import healthchecks
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.devices import DevicesClient
from mainframe.sources.models import Source

logger = structlog.get_logger(__name__)


def should_notify(devices):
    return list(map(str, filter(attrgetter("should_notify_presence"), devices)))


class Command(BaseCommand):
    def handle(self, *_, **options):
        healthchecks.ping("devices")

        client = DevicesClient(Source.objects.default(), logger=logger)
        raw_new_devices, raw_went_online, raw_went_offline = client.run()
        msg = ""
        if new_devices := should_notify(raw_new_devices):
            msg += (
                f"⚠️ {len(new_devices)} new device{'s' if len(new_devices) > 1 else ''} "
                f"joined: {', '.join(new_devices)}"
            )
        if went_online := should_notify(raw_went_online):
            msg += (
                f"\n🌝 {len(went_online)} device"
                f"{'s' if len(went_online) > 1 else ''} "
                f"went online: {', '.join(went_online)}"
            )
        if went_offline := should_notify(raw_went_offline):
            msg += (
                f"\n🚪 {len(went_offline)} device"
                f"{'s' if len(went_offline) > 1 else ''} "
                f"went offline: {', '.join(went_offline)}"
            )

        if msg:
            asyncio.run(
                send_telegram_message(msg, logger=logger, parse_mode=ParseMode.HTML)
            )

        logger.info(
            "Check devices complete!",
            new_devices=len(raw_new_devices),
            went_online=len(raw_went_online),
            went_offline=len(raw_went_offline),
        )
