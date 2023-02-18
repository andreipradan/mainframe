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

    @property
    def prefix(self):
        raise NotImplementedError

    def handle(self, *args, **options):
        self.logger.info(f"{self.prefix} Checking earthquakes...")

        try:
            instance = Bot.objects.get(additional_data__earthquake__isnull=False)
        except OperationalError as e:
            return self.logger.error(e)
        except Bot.DoesNotExist:
            return self.logger.error(
                self.style.ERROR(f"{self.prefix} No bots with earthquake config")
            )

        earthquake_config = instance.additional_data["earthquake"]

        bot = telegram.Bot(instance.token)

        def send_message(text):
            try:
                bot.send_message(
                    chat_id=earthquake_config["chat_id"],
                    text=text,
                    parse_mode=telegram.ParseMode.HTML,
                )
            except telegram.error.TelegramError as te:
                self.logger.error(f"{self.prefix} {str(te)}")

        try:
            response = self.fetch(**options)
            response.raise_for_status()
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.HTTPError,
            requests.exceptions.ReadTimeout,
        ) as e:
            raise CommandError(str(e))

        events = [self.parse_earthquake(event) for event in self.fetch_events(response)]
        if not events:
            return self.logger.warning(f"{self.prefix} No events found!")

        if latest := Earthquake.objects.order_by("-timestamp").first():
            events = [e for e in events if e.timestamp > latest.timestamp]
            if not events:
                return self.logger.info(f"{self.prefix} No new events.")
        else:
            self.logger.info(f"{self.prefix} No events in db.")

        self.logger.info(f"{self.prefix} Saving {len(events)}.")
        Earthquake.objects.bulk_create(events, ignore_conflicts=True)

        if min_magnitude := earthquake_config.get("min_magnitude"):
            self.logger.info(
                f"{self.prefix} Filtering by min magnitude: {min_magnitude}"
            )
            events = [
                event
                for event in events
                if float(event.magnitude) >= float(min_magnitude)
            ]
        else:
            self.logger.info(f"{self.prefix} No min magnitude set")

        if len(events):
            self.logger.info(
                f"{self.prefix} Got {len(events)} events. Sending to telegram..."
            )
            send_message("\n\n".join(parse_event(event) for event in events))
        else:
            self.logger.info(f"{self.prefix} No new events > {min_magnitude} ML")

        now = datetime.now().astimezone(pytz.timezone("Europe/Bucharest"))
        earthquake_config[self.source]["last_check"] = now.strftime(DATETIME_FORMAT)
        instance.save()
        self.stdout.write(self.style.SUCCESS(f"{self.prefix} Done."))

    def fetch(self, **options):
        raise NotImplementedError

    def fetch_events(self, response):
        raise NotImplementedError

    def parse_earthquake(self, card):
        raise NotImplementedError
