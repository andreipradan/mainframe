import asyncio
import json
import logging
import math
from datetime import datetime
from unicodedata import normalize
from zoneinfo import ZoneInfo

import aiohttp
import environ
from bs4 import BeautifulSoup
from django.conf import settings
from django.core.management import BaseCommand, CommandError
from rest_framework import status

from mainframe.clients.chat import send_telegram_message

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--chat_id", type=str)
        parser.add_argument("--categories", type=list, required=True, nargs="+")

    def handle(self, *_, **options):
        chat_id = options["chat_id"]
        if not chat_id:
            chat_id = environ.Env()("TELEGRAM_CHAT_ID")

        logger.info("Checking today's sport events")
        results = fetch_all(options["categories"])

        results_size = len(results)
        max_size = 2000
        if results_size < max_size:
            batches_no = 1
            chunks = [results]
        else:
            batches_no = math.ceil(results_size / max_size)
            chunks = [
                results[i * max_size : i * max_size + max_size]
                for i in range(batches_no)
            ]

        logger.info(
            "Got %d character results. Split in %d batches.", results_size, batches_no
        )
        if batches_no > 10:  # noqa: PLR2004
            logger.warning("Too many batches: %s, sending only first 10", batches_no)
            chunks = chunks[:10]

        for i, chunk in enumerate(chunks):
            text = f"{chunk}\n[[{i + 1}/{batches_no}]]"
            asyncio.run(send_telegram_message(text, chat_id=chat_id, logger=logger))

        self.stdout.write(self.style.SUCCESS("Done."))


def callback(args):
    response, url, categories = args
    if not response:
        return f"No response returned from {url}"
    try:
        return parse_ergast(json.loads(response))
    except json.JSONDecodeError:
        return parse_flash_score(response, categories)


async def fetch(session, sem, url, categories):
    async with sem:
        try:
            async with session.get(url) as response:
                if response.status != status.HTTP_200_OK:
                    err = f"Unexpected status for {url} ({response.status})"
                    raise CommandError(err)
                return await response.text(), url, categories
        except aiohttp.client_exceptions.ClientConnectorError as e:
            logger.error(e)
            return "", url, []


def fetch_all(categories):
    events = "".join(
        asyncio.run(
            fetch_many(
                [
                    "https://m.flashscore.ro/",
                    "https://m.flashscore.ro/snooker/",
                    "https://ergast.com/api/f1/current.json",
                ],
                categories,
            )
        )
    )
    hello = "Neața, "
    hello += "evenimentele de azi" if events else "nu sunt evenimente azi"

    footer = f"*Surse*\n https://flashscore.ro/ (termeni: {', '.join(categories)})"
    footer += "\n https://ergast.com/api/f1/current.json"
    return f"*{hello}*{events}\n\n{footer}"


async def fetch_many(urls, categories):
    sem = asyncio.Semaphore(1000)
    async with aiohttp.ClientSession() as session:
        return map(
            callback,
            await asyncio.gather(
                *[fetch(session, sem, url, categories) for url in urls]
            ),
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
        return None
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


def parse_flash_score(response, categories):
    soup = BeautifulSoup(response, features="html.parser")
    results = parse_categories(
        soup.html.body.find("div", {"id": "score-data"}).children,
        categories,
    )
    sport = soup.html.body.find("h2").text.split(" ")[0]
    if "Snooker" in sport:
        sport = f"🎱 {sport}"
    elif "Fotbal" in sport:
        sport = f"⚽️ {sport}"
    return f"\n\n*{sport}*{parse_list_details(results)}" if results else ""


def parse_categories(contents, categories):
    by_category = {}
    while category := get_next_category(contents):
        found = False
        for defined_category in categories:
            if len(defined_category.strip()) < 3:  # noqa: PLR2004
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


def strip_accents(string):
    string = string.lower()
    return normalize("NFD", string).encode("ascii", "ignore").decode()


def to_local(date_time):
    dt = datetime.fromisoformat(date_time.replace("Z", "+00:00"))
    return dt.astimezone(ZoneInfo(settings.TIME_ZONE)).strftime("%H:%M")
