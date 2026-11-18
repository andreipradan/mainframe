from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import structlog
from django.conf import settings
from telegram.constants import ParseMode

from mainframe.bots.models import Bot
from mainframe.clients import healthchecks
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.scraper import fetch
from mainframe.earthquakes.models import Earthquake

DATETIME_FORMAT = "%d.%m.%Y, %H:%M:%S %z"
COORDINATE_QUANTUM = Decimal("0.00001")


def normalize_coordinates(latitude, longitude):
    return (
        Decimal(str(latitude)).quantize(COORDINATE_QUANTUM),
        Decimal(str(longitude)).quantize(COORDINATE_QUANTUM),
    )


def get_event_key(event):
    return (
        *normalize_coordinates(event.latitude, event.longitude),
        event.timestamp,
    )


def get_magnitude_icon(magnitude):
    magnitude = float(magnitude)
    if magnitude < 4:  # noqa: PLR2004
        return "🟢"
    if magnitude < 5:  # noqa: PLR2004
        return "🟡"
    if magnitude < 6:  # noqa: PLR2004
        return "🟠"
    return "🔴"


def parse_event(event: Earthquake):
    icon = get_magnitude_icon(event.magnitude)
    intensity = f"Intensity: {event.intensity}" if event.intensity else ""
    return (
        f"{icon} <b>Earthquake alert</b>\n"
        f"Magnitude: <b>{event.magnitude}</b>\n"
        f"Location: <a href='{event.url}'>{event.location}</a>\n\n"
        f"Depth: {event.depth} km\n"
        f"{intensity}\n"
        f"Time: {event.timestamp}"
    )


class BaseEarthquakeCommand:
    default_max_radius = 386.02
    source = NotImplemented
    url = NotImplemented

    def handle(self, *_, **__):
        logger = structlog.get_logger(f"{__name__}.{self.source}")
        logger = logger.bind(identifier=self.source)
        healthchecks.ping(self.source)
        response, error = fetch(
            self.url,
            soup=False,
            **self.get_kwargs(),
        )
        if error:
            if self.source == Earthquake.SOURCE_INFP:
                logger.warning("Fetching INFP earthquakes failed", error=str(error))
            else:
                logger.error("Fetching USGS earthquakes failed", error=str(error))
            return

        instance = Bot.objects.get(additional_data__earthquake__isnull=False)
        events = [self.parse_earthquake(event) for event in self.fetch_events(response)]
        if not events:
            self.set_last_check(instance)
            return

        event_timestamps = {event.timestamp for event in events}
        Earthquake.objects.bulk_create(
            events,
            update_conflicts=True,
            update_fields=[
                "depth",
                "intensity",
                "location",
                "magnitude",
            ],
            unique_fields=["latitude", "longitude", "source", "timestamp"],
        )

        stored_events = {
            get_event_key(event): event
            for event in Earthquake.objects.filter(
                source=self.source,
                timestamp__in=event_timestamps,
            )
        }

        earthquake_config = instance.additional_data["earthquake"]
        min_magnitude = earthquake_config["min_magnitude"]
        pending_events = []
        for event in events:
            stored_event = stored_events[get_event_key(event)]
            if (
                float(event.magnitude) >= float(min_magnitude)
                and event.is_local
                and not (stored_event.additional_data or {}).get("telegram_notified")
            ):
                pending_events.append(stored_event)
        events = pending_events

        if events:
            logger.warning(
                "New earthquakes!",
                count=len(events),
                min_magnitude=min_magnitude,
            )
            result = send_telegram_message(
                text="\n\n".join(parse_event(event) for event in events),
                parse_mode=ParseMode.HTML,
            )
            if result is not None:
                for event in events:
                    additional_data = dict(event.additional_data or {})
                    additional_data["telegram_notified"] = True
                    event.additional_data = additional_data
                    event.save(update_fields=["additional_data"])

        self.set_last_check(instance)

    def get_kwargs(self) -> dict:
        raise NotImplementedError

    @staticmethod
    def fetch_events(response):
        raise NotImplementedError

    def parse_earthquake(self, card) -> Earthquake:
        raise NotImplementedError

    def set_last_check(self, instance):
        earthquake_config = instance.additional_data["earthquake"]
        now = datetime.now().astimezone(ZoneInfo(settings.TIME_ZONE))
        parsed_now = now.strftime(DATETIME_FORMAT)
        earthquake_config.setdefault("last_check", {})[self.source] = parsed_now
        instance.save()
