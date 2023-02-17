import logging
import operator
from datetime import datetime, timedelta

import pytz
import requests
import telegram
from bs4 import BeautifulSoup
from django.core.management import CommandError, BaseCommand

from bots.models import Bot
from earthquakes.models import Earthquake

logger = logging.getLogger(__name__)

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


class Command(BaseCommand):
    prefix = "[INFP]"

    def add_arguments(self, parser):
        parser.add_argument("--minutes", type=int, help="Since how many minutes ago")

    def handle(self, *args, **options):
        logger.info(f"{self.prefix} Checking earthquakes...")

        try:
            instance = Bot.objects.get(additional_data__earthquake__isnull=False)
        except Bot.DoesNotExist:
            return logger.error(
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
                logger.error(f"{self.prefix} {str(te)}")

        try:
            response = requests.get(earthquake_config["url"], timeout=45)
            response.raise_for_status()
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.HTTPError,
            requests.exceptions.ReadTimeout,
        ) as e:
            raise CommandError(str(e))

        soup = BeautifulSoup(response.text, features="html.parser")
        earthquakes = soup.html.body.find_all("div", {"class": "card"})
        events = sorted(
            [self.parse_earthquake(earthquake) for earthquake in earthquakes],
            key=operator.attrgetter("timestamp"),
            reverse=True,
        )
        if not events:
            return logger.warning(f"{self.prefix} No events found!")

        if latest := Earthquake.objects.order_by("-timestamp").first():
            events = [e for e in events if e.timestamp > latest.timestamp]
            if not events:
                return logger.info(f"{self.prefix} No new events.")
        else:
            logger.info(f"{self.prefix} No events in db.")

        logger.info(f"{self.prefix} Saving {len(events)}.")
        Earthquake.objects.bulk_create(events, ignore_conflicts=True)

        if min_magnitude := earthquake_config.get("min_magnitude"):
            logger.info(f"{self.prefix} Filtering by min magnitude: {min_magnitude}")
            events = [
                event
                for event in events
                if float(event.magnitude) >= float(min_magnitude)
            ]
        else:
            logger.info(f"{self.prefix} No min magnitude set")

        if len(events):
            logger.info(
                f"{self.prefix} Got {len(events)} events. Sending to telegram..."
            )
            send_message("\n\n".join(parse_event(event) for event in events))
        else:
            logger.info(f"{self.prefix} No new events > {min_magnitude} ML")

        now = datetime.now().astimezone(pytz.timezone("Europe/Bucharest"))
        earthquake_config["last_check"] = now.strftime(DATETIME_FORMAT)
        instance.save()
        self.stdout.write(self.style.SUCCESS("Done."))

    def get_datetime(self, string):
        date, time, tz = string.split()
        return datetime.strptime(f"{date} {time}", "%d.%m.%Y, %H:%M:%S").replace(
            tzinfo=pytz.timezone(tz)
        )

    def parse_earthquake(self, card):
        body = card.find("div", {"class": "card-body"})
        text, *rest = body.find_all("p")
        lat = (
            body.find("span", {"title": "Latitudine"})
            .text.strip("\n Latitudine")
            .strip(" °N")
        )
        long = (
            body.find("span", {"title": "Longitudine"})
            .text.strip("\n Longitudine")
            .strip(" °E")
        )
        magnitude, *location = (
            card.find("div", {"class": "card-footer"}).text.strip().split(", ")
        )
        timestamp = (
            card.find("div", {"class": "card-header"})
            .text.replace("Loading...", "")
            .strip()
        )
        return Earthquake(
            timestamp=self.get_datetime(timestamp),
            depth=text.text.strip().split("la adâncimea de ")[1][:-1].split(" ")[0],
            intensity=rest[0].text.strip().split()[1] if len(rest) > 1 else None,
            latitude=lat,
            longitude=long,
            location=",".join(location),
            magnitude=magnitude.split()[1],
            source=Earthquake.SOURCE_INFP,
        )
