import asyncio
import itertools
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import List

import aiohttp
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand, CommandError
from django.core.signing import Signer

from bots.models import Bot
from core.settings import get_file_handler
from meals.models import Meal

logger = logging.getLogger(__name__)
logger.addHandler(get_file_handler(Path(__file__).stem))

TYPE_MAPPING = {
    "mic dejun": Meal.TYPE_BREAKFAST,
    "gustare #1": Meal.TYPE_SNACK_1,
    "pranz": Meal.TYPE_LUNCH,
    "gustare #2": Meal.TYPE_SNACK_2,
    "cina": Meal.TYPE_DINNER,
}


async def fetch(session, sem, url):
    async with sem:
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    msg = f"Unexpected status for {url}. Status: {response.status}"
                    if response.status == 404:
                        logger.warning(msg)
                    else:
                        raise ValueError(msg)
                return await response.text(), url
        except aiohttp.client_exceptions.ClientConnectorError as e:
            logger.error(e)
            return "", url


async def fetch_many(urls):
    sem = asyncio.Semaphore(1000)
    async with aiohttp.ClientSession() as session:
        return map(
            parse_week,
            await asyncio.gather(*[fetch(session, sem, url) for url in urls]),
        )


def parse_meal(row) -> Meal:
    def parse(css_class):
        div = row.find("div", {"class": css_class})
        if not div:
            raise CommandError(f"No {css_class} found in {row}")
        return div

    ingredients = [i.text.strip() for i in parse("recipe-lists").find_all("li")]
    quantities = parse_quantities(parse("quantity-bar"))
    nutritional_values = parse_nutritional_values(parse("menu-pic").table)
    return Meal(
        name=row.h4.text,
        type=TYPE_MAPPING[row.h2.text.lower()],
        ingredients=ingredients,
        quantities=quantities,
        nutritional_values=nutritional_values,
    )


def parse_nutritional_values(nutritional_div):
    results = {}
    values = [x.text.strip() for x in nutritional_div.find_all("td")][2:]
    while values:
        results[values.pop()] = values.pop()
    return results


def parse_quantities(quantities_div):
    quantities, grams = quantities_div.find_all("ul")
    quantities = [q.text.strip() for q in quantities if q.text.strip()]
    grams = [g.text.strip() for g in grams if g.text.strip()]
    return dict(zip(quantities, grams))


def parse_week(args) -> List[Meal]:
    response_text, url = args
    soup = BeautifulSoup(response_text, features="html.parser")

    week = (
        soup.find("div", {"class": "weekly-buttons"})
        .find("button", {"class": "active"})
        .text.split("-")[1]
    )
    week = week.replace(" mai", " may")
    current_date = (
        datetime.strptime(week, "%d %b").date() - timedelta(days=7)
    ).replace(year=datetime.today().year)

    rows = soup.select(".slider-menu-for-day > div > .row")
    if not rows:
        logger.error(f"URL: {url}. No rows found")
        return []

    meals = []
    for row in rows:
        meal = parse_meal(row)
        if row.attrs["class"] == ["row"]:
            current_date = current_date + timedelta(days=1)
        meal.date = current_date
        meals.append(meal)
    return meals


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger.info("Fetching menu for the next month")

        base_url = Signer().unsign_object(
            "Imh0dHBzOi8vd3d3LmxpZmVib3gucm8vb3B0aW1ib3gtMSI:"
            "Hhq6D12GLwL3MuG7vmBv7LoXyDQND-lb6wg9QVqh1Sg"
        )
        urls = [f"{base_url}/week-{week_no}" for week_no in range(1, 5)]
        meals = list(itertools.chain.from_iterable(asyncio.run(fetch_many(urls))))

        Meal.objects.bulk_create(
            meals,
            update_conflicts=True,
            update_fields=("name", "ingredients", "nutritional_values", "quantities"),
            unique_fields=("date", "type"),
        )
        msg = f"Fetched {len(meals)} meals"
        logger.info(msg)
        bot = Bot.objects.get(additional_data__debug_chat_id__isnull=False)
        bot.send_message(chat_id=bot.additional_data["debug_chat_id"], text=msg)

        self.stdout.write(self.style.SUCCESS("Done."))
