import logging
from datetime import datetime, timedelta

import pytz
import requests
import telegram
from django.core.management import CommandError, BaseCommand

from bots.models import Bot
from earthquakes.management.commands.check_infp import parse_event
from earthquakes.models import Earthquake

logger = logging.getLogger(__name__)

DATETIME_FORMAT = "%d.%m.%Y, %H:%M:%S %z"


class Command(BaseCommand):
    url = r"https://earthquake.usgs.gov/fdsnws/event/1/query?"
    params = {
        "format": "geojson",
        "starttime": datetime.now().astimezone(pytz.utc) - timedelta(days=100),
        "latitude": 45.94320,
        "longitude": 24.96680,
        "maxradiuskm": 386.02,
        "minmagnitude": 2,
    }

    def add_arguments(self, parser):
        parser.add_argument("--minutes", type=int, help="Since how many minutes ago")

    def handle(self, *args, **options):
        logger.info("Checking usgs earthquakes...")

        try:
            instance = Bot.objects.get(additional_data__earthquake__isnull=False)
        except Bot.DoesNotExist:
            return logger.error(self.style.ERROR("No bots with earthquake config"))

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
                logger.error(str(te))

        try:
            response = requests.get(self.url, params=self.params, timeout=45)
            response.raise_for_status()
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.HTTPError,
            requests.exceptions.ReadTimeout,
        ) as e:
            raise CommandError(str(e))

        since = datetime.now().astimezone(
            pytz.timezone("Europe/Bucharest")
        ) - timedelta(minutes=5)
        if options["minutes"]:
            since = datetime.now().astimezone(
                pytz.timezone("Europe/Bucharest")
            ) - timedelta(minutes=options["minutes"])
        elif latest := Earthquake.objects.order_by("-timestamp").first():
            since = latest.timestamp

        events = [self.parse_earthquake(event) for event in response.json()["features"]]

        Earthquake.objects.bulk_create(events, ignore_conflicts=True)

        events = [event for event in events if event.timestamp > since]
        if min_magnitude := earthquake_config.get("min_magnitude"):
            logger.info(f"Filtering by min magnitude: {min_magnitude}")
            events = [
                event
                for event in events
                if float(event.magnitude) >= float(min_magnitude)
            ]
        else:
            logger.info("No min magnitude set")

        if len(events):
            logger.info(f"Got {len(events)} events. Sending to telegram...")
            send_message("\n\n".join(parse_event(event) for event in events))
        else:
            logger.info(
                f"No events since {since.strftime(DATETIME_FORMAT)} (In the last 20 events)"
            )

        now = datetime.now().astimezone(pytz.timezone("Europe/Bucharest"))
        earthquake_config[Earthquake.SOURCE_USGS]["last_check"] = now.strftime(
            DATETIME_FORMAT
        )
        instance.save()
        self.stdout.write(self.style.SUCCESS("Done."))

    def parse_earthquake(self, event):
        props = event["properties"]
        lat, long, depth = event["geometry"]["coordinates"]
        return Earthquake(
            timestamp=datetime.fromtimestamp(props["time"]).astimezone(pytz.utc),
            depth=depth,
            intensity=None,
            latitude=lat,
            longitude=long,
            location=props["place"],
            magnitude=props["mag"],
            source=Earthquake.SOURCE_USGS,
        )
