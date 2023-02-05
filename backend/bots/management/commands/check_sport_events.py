import asyncio
import json
import logging

from datetime import datetime
from unicodedata import normalize
from zoneinfo import ZoneInfo

import aiohttp
import environ
import telegram

from bs4 import BeautifulSoup
from django.core.management import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        results = fetch_all()
        logger.info(f"Sending {len(results)} character message")
        try:
            send_message(results)
            logger.debug("Message sent")
        except telegram.error.BadRequest as e:
            logger.warning(f"Bad request: {e}. Trying to split the message")
            half = int(len(results) / 2)
            send_message(text=results[:half] + " [[1/2 - continued below..]]")
            send_message(text="[[2/2]] " + results[half:])
            logger.debug("2/2 messages sent")

        self.stdout.write(self.style.SUCCESS("Done."))


def callback(response):
    try:
        return parse_ergast(json.loads(response))
    except json.JSONDecodeError:
        return parse_flash_score(response)


async def fetch(session, sem, url):
    async with sem:
        async with session.get(url) as response:
            if response.status != 200:
                raise ValueError(f"Unable to fetch {url}. Status: {response.status}")
            return await response.text()


def fetch_all():
    events = "".join(
        asyncio.run(
            fetch_many(
                [
                    "https://m.flashscore.ro/",
                    "https://m.flashscore.ro/snooker/",
                    "https://ergast.com/api/f1/current.json",
                ]
            )
        )
    )
    hello = "Neața, "
    hello += "evenimentele de azi" if events else "nu sunt evenimente azi"

    footer = f"*Surse*\n https://flashscore.ro/ (termeni: {environ.Env()('SPORT_EVENTS_CATEGORIES')})"
    footer += "\n https://ergast.com/api/f1/current.json"
    return f"*{hello}*{events}\n\n{footer}"


async def fetch_many(urls):
    sem = asyncio.Semaphore(1000)
    async with aiohttp.ClientSession() as session:
        return map(
            callback, await asyncio.gather(*[fetch(session, sem, url) for url in urls])
        )


def get_match(contents):
    result = []
    while (match_component := next(contents)).name != "br":
        stripped = match_component.text.strip()
        if stripped:
            result.append(stripped)
        if attrs := getattr(match_component, "attrs", {}).get("class"):
            (attr,) = attrs
            if attr in ["live", "sched"]:
                result.pop()
                continue
            if attr == "fin":
                result[-1] = f"*{result[-1]}*"
                attr = "✅️"
            elif "rcard" in attr:
                attr = "🟥" * int(attr.split("-")[1])
            result.append(f"[[{attr}]]")
    return " ".join(result)


def get_next_category(contents):
    try:
        while (item := next(contents)).name != "h4":
            continue
    except StopIteration:
        return
    return item.text.strip()


def get_time(item):
    if len(item.contents) == 1:
        return item.text.strip()
    time, *details = [i.text for i in item.contents]
    return f"{time} *[{', '.join(details)}]*"


def parse_ergast(response):
    results = {}
    today = datetime.today().date().isoformat()
    for race in response["MRData"]["RaceTable"]["Races"]:
        if today == race["date"]:
            race_datetime = f"{race['date']} {race['time']}"
            results[race["raceName"]] = [f"Race: {to_local(race_datetime)}"]
        for event in [
            "First Practice",
            "Second Practice",
            "Third Practice",
            "Qualifying",
            "Sprint",
        ]:
            key = event.replace(" ", "")
            if today == race.get(key, {}).get("date"):
                event_datetime = to_local(f"{race[key]['date']} {race[key]['time']}")
                results.setdefault(race["raceName"], []).append(
                    f"{event_datetime} {event}"
                )
    return f"\n\n*🏎 Formula 1*{parse_list_details(results)}" if results else ""


def parse_flash_score(response):
    soup = BeautifulSoup(response, features="html.parser")
    results = parse_categories(
        soup.html.body.find("div", {"id": "score-data"}).children
    )
    sport = soup.html.body.find("h2").text.split(" ")[0]
    if "Snooker" in sport:
        sport = f"🎱 {sport}"
    elif "Fotbal" in sport:
        sport = f"⚽️ {sport}"
    return f"\n\n*{sport}*{parse_list_details(results)}" if results else ""


def parse_categories(contents):
    by_category = {}
    while category := get_next_category(contents):
        found = False
        for defined_category in environ.Env()("SPORT_EVENTS_CATEGORIES").split(","):
            if len(defined_category.strip()) < 3:
                break
            if strip_accents(defined_category) in strip_accents(category):
                found = True
                break
        if not found:
            continue

        by_category[category] = []
        try:
            while (item := next(contents)).name != "h4":
                timestamp = get_time(item)
                match = get_match(contents)

                live_prefix = "" if ":" in timestamp else "❗"
                by_category[category].append(f"{live_prefix}{timestamp} {match}")
        except StopIteration:
            break
    return by_category


def parse_list_details(data):
    if not data:
        return ""
    return "\n".join(
        [f"\n_{title}_\n " + "\n ".join(stats) for title, stats in sorted(data.items())]
    )


def send_message(text):
    return telegram.Bot(environ.Env()("SPORT_EVENTS_BOT_TOKEN")).send_message(
        chat_id=environ.Env()("SPORT_EVENTS_CHAT_ID"),
        disable_notification=True,
        disable_web_page_preview=True,
        text=text,
        parse_mode=telegram.ParseMode.MARKDOWN,
    )


def strip_accents(string):
    string = string.lower()
    return normalize("NFD", string).encode("ascii", "ignore").decode("utf-8")


def to_local(date_time):
    dt = datetime.fromisoformat(date_time.replace("Z", "+00:00"))
    return dt.astimezone(ZoneInfo("Europe/Bucharest")).strftime("%H:%M")
