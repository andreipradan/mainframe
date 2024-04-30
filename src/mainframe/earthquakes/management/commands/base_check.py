from datetime import datetime

import pytz
import requests
import telegram
from django.core.management import BaseCommand
from django.db import OperationalError
from mainframe.bots.models import Bot
from mainframe.clients import healthchecks
from mainframe.clients.chat import send_telegram_message
from mainframe.earthquakes.models import Earthquake

DATETIME_FORMAT = "%d.%m.%Y, %H:%M:%S %z"


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


class BaseEarthquakeCommand(BaseCommand):
    logger = NotImplemented
    source = NotImplemented
    url = NotImplemented

    def handle(self, *_, **options):
        healthchecks.ping(self.source)
        try:
            response = self.fetch(**options)
            response.raise_for_status()
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.HTTPError,
            requests.exceptions.ReadTimeout,
        ) as e:
            return self.logger.warning(str(e))

        try:
            instance = Bot.objects.get(additional_data__earthquake__isnull=False)
        except OperationalError as e:
            return self.logger.error(str(e))
        except Bot.DoesNotExist:
            return self.logger.error(self.style.ERROR("No bots with earthquake config"))

        events = [self.parse_earthquake(event) for event in self.fetch_events(response)]
        if self.source == Earthquake.SOURCE_INFP:
            latest = (
                Earthquake.objects.filter(source=Earthquake.SOURCE_INFP)
                .order_by("-timestamp")
                .first()
            )
            events = [event for event in events if event.timestamp > latest.timestamp]
        if not events:
            self.set_last_check(instance)
            return

        Earthquake.objects.bulk_create(
            events,
            update_conflicts=True,
            update_fields=[
                "depth",
                "intensity",
                "location",
                "latitude",
                "longitude",
                "magnitude",
            ],
            unique_fields=["timestamp"],
        )

        earthquake_config = instance.additional_data["earthquake"]
        min_magnitude = earthquake_config["min_magnitude"]
        events = [
            event
            for event in events
            if float(event.magnitude) >= float(min_magnitude)
            and event.additional_data.get("sols", {})
            .get("primary", {})
            .get("region", {})
            .get("type")
            == "local"
        ]

        if len(events):
            self.logger.info(
                "Got %s events with magnitude >= %s", len(events), min_magnitude
            )
            send_telegram_message(
                text="\n\n".join(parse_event(event) for event in events),
                parse_mode=telegram.ParseMode.HTML,
            )

        self.set_last_check(instance)
        self.stdout.write(self.style.SUCCESS("Done."))

    def fetch(self, **options):
        raise NotImplementedError

    def fetch_events(self, response):
        raise NotImplementedError

    def parse_earthquake(self, card) -> Earthquake:
        raise NotImplementedError

    def set_last_check(self, instance):
        earthquake_config = instance.additional_data["earthquake"]
        now = datetime.now().astimezone(pytz.timezone("Europe/Bucharest"))
        parsed_now = now.strftime(DATETIME_FORMAT)
        earthquake_config["last_check"] = parsed_now
        earthquake_config[self.source]["last_check"] = parsed_now
        instance.save()
