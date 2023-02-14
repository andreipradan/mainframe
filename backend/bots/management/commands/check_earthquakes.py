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
        f"<b>{get_magnitude_icon(event['magnitude'])} {event['magnitude']}</b>"
        f" - {event['location']}\n"
        f"{event['datetime']}\n"
        f"Adâncime: {event['depth']}\n" +
        (f"Intensitate: {event['intensity']}\n" if event['intensity'] else '') +
        f"📍 {event['url']}"
    )


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger.info("Checking earthquakes...")

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

        soup = BeautifulSoup(response.text, features="html.parser")
        cards = soup.html.body.find_all("div", {"class": "card"})
        events = [self.parse_card(card) for card in cards]
        events = [
            event
            for event in events
            if self.get_datetime(event["datetime"])
               > self.get_datetime(earthquake_config["latest"]["datetime"])
        ]

        if len(events):
            logger.info(f"Got {len(events)} events. Sending to telegram...")
            send_message(
                "\n\n".join(parse_event(event)for event in events)
            )
            instance.additional_data["earthquake"]["latest"] = events[0]
            instance.save()
        else:
            logger.info(
                f"No events since {earthquake_config['latest']['datetime']}"
            )

        self.stdout.write(self.style.SUCCESS("Done."))

    def get_datetime(self, string):
        date, time, tz = string.split()
        return datetime.strptime(f"{date} {time}", "%d.%m.%Y, %H:%M:%S").replace(
            tzinfo=pytz.timezone(tz)
        )

    def parse_card(self, card):
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

        return {
            "datetime": card.find("div", {"class": "card-header"}).text.replace("Loading...", "").strip(),
            "depth": text.text.strip().split("la adâncimea de ")[1][:-1],
            "intensity": rest[0].text.strip().split()[1] if len(rest) > 1 else '',
            "location": ','.join(location),
            "magnitude": magnitude.split()[1],
            "url": f"https://www.google.com/maps/search/{lat},{long}"
        }
