from datetime import datetime

import pytz
import requests
import telegram
from django.core.management import CommandError, BaseCommand
from django.db import OperationalError

from bots.models import Bot
from earthquakes.models import Earthquake

DATETIME_FORMAT = "%d.%m.%Y, %H:%M:%S %z"


def get_magnitude_icon(magnitude):
    magnitude = float(magnitude)
    if magnitude < 4:
        return "🟢"
    if magnitude < 5:
        return "🟡"
    if magnitude < 6:
        return "🟠"
    else:
        return "🔴"


def parse_event(event):
    return (
        f"<b>{get_magnitude_icon(event.magnitude)} {event.magnitude}</b>"
        f" - {event.location}\n"
        f"{event.timestamp}\n"
        f"Depth: {event.depth}\n"
        + (f"Intensity: {event.intensity}\n" if event.intensity else "")
        + f"{event.url}"
    )


class BaseEarthquakeCommand(BaseCommand):
    logger = NotImplemented
    source = NotImplemented
    url = NotImplemented

    def handle(self, *args, **options):
        self.logger.info(f"Checking...")

        try:
            response = self.fetch(**options)
            response.raise_for_status()
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.HTTPError,
            requests.exceptions.ReadTimeout,
        ) as e:
            raise CommandError(str(e))

        try:
            instance = Bot.objects.get(additional_data__earthquake__isnull=False)
        except OperationalError as e:
            return self.logger.error(str(e))
        except Bot.DoesNotExist:
            return self.logger.error(self.style.ERROR("No bots with earthquake config"))

        events = [self.parse_earthquake(event) for event in self.fetch_events(response)]
        if not events:
            self.set_last_check(instance)
            return self.logger.warning("No events found!")

        self.logger.info(f"Saving {len(events)}.")
        Earthquake.objects.bulk_create(
            events,
            update_conflicts=True,
            update_fields=["depth", "intensity", "location", "latitude", "longitude", "magnitude"],
            unique_fields=["timestamp"],
        )

        earthquake_config = instance.additional_data["earthquake"]
        if min_magnitude := earthquake_config.get("min_magnitude"):
            self.logger.info(f"Filtering by min magnitude: {min_magnitude}")
            events = [
                event
                for event in events
                if float(event.magnitude) >= float(min_magnitude)
            ]
        else:
            self.logger.info("No min magnitude set")

        if len(events):
            self.logger.info(f"Got {len(events)} events. Sending to telegram...")
            try:
                instance.send_message(
                    chat_id=earthquake_config["chat_id"],
                    text="\n\n".join(parse_event(event) for event in events),
                    parse_mode=telegram.ParseMode.HTML,
                )
            except telegram.error.TelegramError as te:
                self.logger.error(str(te))
        else:
            self.logger.info(f"No new events > {min_magnitude} ML")

        self.set_last_check(instance)
        self.stdout.write(self.style.SUCCESS("Done."))

    def fetch(self, **options):
        raise NotImplementedError

    def fetch_events(self, response):
        raise NotImplementedError

    def parse_earthquake(self, card):
        raise NotImplementedError

    def set_last_check(self, instance):
        earthquake_config = instance.additional_data["earthquake"]
        now = datetime.now().astimezone(pytz.timezone("Europe/Bucharest"))
        parsed_now = now.strftime(DATETIME_FORMAT)
        earthquake_config["last_check"] = parsed_now
        earthquake_config[self.source]["last_check"] = parsed_now
        instance.save()
