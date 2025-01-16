import asyncio
import itertools
from datetime import datetime, timedelta
from typing import List

import aiohttp
from bs4 import BeautifulSoup
from django.core.signing import Signer
from mainframe.core.logs import get_default_logger
from mainframe.meals.models import Meal
from rest_framework import status

logger = get_default_logger(__name__)

TYPE_MAPPING = {
    "mic dejun": Meal.TYPE_BREAKFAST,
    "gustare #1": Meal.TYPE_SNACK_1,
    "pranz": Meal.TYPE_LUNCH,
    "gustare #2": Meal.TYPE_SNACK_2,
    "cina": Meal.TYPE_DINNER,
}


class FetchMealsException(Exception):
    pass


async def fetch(session, sem, url):
    async with sem:
        try:
            async with session.get(url) as response:
                if response.status != status.HTTP_200_OK:
                    msg = f"Unexpected status for {url}. Status: {response.status}"
                    if response.status == status.HTTP_404_NOT_FOUND:
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
            raise FetchMealsException(f"No {css_class} found in {row}")
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
    return dict(zip(quantities, grams, strict=False))


def parse_week(args) -> List[Meal]:
    months = {
        "ian": "jan",
        "mai": "may",
        "iun": "jun",
        "iul": "jul",
        "noi": "nov",
    }
    response_text, url = args
    soup = BeautifulSoup(response_text, features="html.parser")

    week = (
        soup.find("div", {"class": "weekly-buttons"})
        .find("button", {"class": "active"})
        .text.split("-")[1]
    )
    for k, v in months.items():
        week = week.replace(f" {k}", f" {v}")

    current_date = datetime.strptime(week, "%d %b").date().replace(
        year=datetime.today().year
    ) - timedelta(days=7)

    rows = soup.select(".slider-menu-for-day > div > .row")
    if not rows:
        logger.error("URL: %s. No rows found", url)
        return []

    meals = []
    for row in rows:
        meal = parse_meal(row)
        if row.attrs["class"] == ["row"]:
            current_date = current_date + timedelta(days=1)
        meal.date = current_date
        meals.append(meal)
    return meals


class MealsClient:
    @classmethod
    def fetch_meals(cls) -> List[Meal]:
        url = Signer().unsign_object(
            "Imh0dHBzOi8vd3d3LmxpZmVib3gucm8vb3B0aW1ib3gtMSI:"
            "Hhq6D12GLwL3MuG7vmBv7LoXyDQND-lb6wg9QVqh1Sg"
        )
        urls = [f"{url}/week-{week_no}" for week_no in range(1, 5)]
        meals = list(itertools.chain.from_iterable(asyncio.run(fetch_many(urls))))

        Meal.objects.bulk_create(
            meals,
            update_conflicts=True,
            update_fields=("name", "ingredients", "nutritional_values", "quantities"),
            unique_fields=("date", "type"),
        )
        return meals
