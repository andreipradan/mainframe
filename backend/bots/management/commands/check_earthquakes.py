import logging
from datetime import datetime, timedelta
from operator import itemgetter

import pytz
import requests
import telegram
from bs4 import BeautifulSoup
from django.core.management import CommandError, BaseCommand

from bots.models import Bot

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--minutes", type=int, help="Since how many minutes ago")

    def handle(self, *args, **options):
        minutes = options["minutes"] or 1
        logger.info(
            f"Checking earthquakes from the past {minutes} minute{'s' if minutes > 1 else ''}..."
        )

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
                    disable_notification=True,
                    disable_web_page_preview=True,
                    text=text,
                    parse_mode=telegram.ParseMode.HTML,
                )
            except telegram.error.TelegramError as te:
                logger.error(str(te))

        try:
            response = requests.get(earthquake_config["url"], timeout=45)
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            logger.error(str(e))
            send_message(str(e))
            raise CommandError(str(e))
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.ReadTimeout,
        ) as e:
            raise CommandError(str(e))

        events = self.get_events(response.text, minutes=minutes)

        if len(events):
            logger.info(f"Got {len(events)} events. Sending to telegram...")
            send_message(
                "\n\n".join(
                    event["verbose"]
                    for event in sorted(
                        events, key=itemgetter("datetime"), reverse=True
                    )
                )
            )
            instance.additional_data["earthquake"]["latest"] = events[0]["verbose"]
            instance.save()
        else:
            logger.info(
                f"No events in the past {minutes} minute{'s' if minutes > 1 else ''}"
            )

        self.stdout.write(self.style.SUCCESS("Done."))

    def get_events(self, contents, minutes):
        soup = BeautifulSoup(contents, features="html.parser")
        cards = soup.html.body.find_all("div", {"class": "card"})
        events = [self.parse_card(card) for card in cards]
        now = datetime.now()
        return [
            event
            for event in events
            if event["datetime"]
            >= (now.astimezone(event["datetime"].tzinfo) - timedelta(minutes=minutes))
        ]

    def get_magnitude_icon(self, magnitude):
        magnitude = float(magnitude)
        if magnitude < 4:
            return "🟢"
        if magnitude < 5:
            return "🟡"
        if magnitude < 6:
            return "🟠"
        else:
            return "🔴"

    def parse_card(self, card):
        body = card.find("div", {"class": "card-body"})
        text, *rest = body.find_all("p")
        depth = text.text.strip().split("la adâncimea de ")[1][:-1]
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
        date, time, tz = (
            card.find("div", {"class": "card-header"})
            .text.replace("Loading...", "")
            .strip()
            .split()
        )
        dt = datetime.strptime(f"{date} {time}", "%d.%m.%Y, %H:%M:%S").replace(
            tzinfo=pytz.timezone(tz)
        )
        mag, *location = (
            card.find("div", {"class": "card-footer"}).text.strip().split(",")
        )
        magnitude = mag.split()[1]

        display_components = [
            f"<b>{self.get_magnitude_icon(magnitude)} {magnitude}</b> - {', '.join(location)}",
            f"Dată: {date} {time} {tz}",
            f"Adâncime: {depth}",
        ]
        if len(rest) > 1:
            intensity = rest[0].text.strip().split()[1]
            display_components.append(f"Intensitate: {intensity}")
        display_components.append(f"📍https://www.google.com/maps/search/{lat},{long}")
        return {
            "datetime": dt,
            "verbose": "\n".join(display_components),
        }
