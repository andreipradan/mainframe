import logging
from datetime import datetime, timedelta


from django.core.management.base import BaseCommand, CommandError
from django.db import OperationalError

from bots.models import Bot
from clients import scraper
from meals.models import Meal

logger = logging.getLogger(__name__)

TYPE_MAPPING = {
    "mic dejun": Meal.TYPE_BREAKFAST,
    "gustare #1": Meal.TYPE_SNACK_1,
    "pranz": Meal.TYPE_LUNCH,
    "gustare #2": Meal.TYPE_SNACK_2,
    "cina": Meal.TYPE_DINNER,
}


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--week", type=int)

    def handle(self, *args, **options):
        logger.info("Fetching menu...")
        try:
            instance = Bot.objects.get(additional_data__menu__isnull=False)
        except OperationalError as e:
            raise CommandError(str(e))
        except Bot.DoesNotExist:
            raise CommandError("Bot with menu config in additional_data missing")

        menu = instance.additional_data["menu"]

        if not isinstance(menu, dict) or not (url := menu.get("url")):
            raise CommandError("url missing from menu config in additional data")

        if week := options["week"]:
            url = f"{url}/week-{week}"

        soup = scraper.fetch(url, logger)
        if isinstance(soup, Exception):
            raise CommandError(str(soup))

        week = (
            soup.find("div", {"class": "weekly-buttons"})
            .find("button", {"class": "active"})
            .text.split("-")[1]
        )
        current_date = (
            datetime.strptime(week, "%d %b").date() - timedelta(days=7)
        ).replace(year=datetime.today().year)

        rows = soup.select(".slider-menu-for-day > div > .row")
        if not rows:
            raise CommandError("No rows found")

        meals = []
        for row in rows:
            meal = self.parse_meal(row)
            if row.attrs["class"] == ["row"]:
                current_date = current_date + timedelta(days=1)
            meal.date = current_date
            meals.append(meal)

        logger.info(f"Got {len(meals)} meals, saving...")

        Meal.objects.bulk_create(
            meals,
            update_conflicts=True,
            update_fields=("name", "ingredients", "nutritional_values", "quantities"),
            unique_fields=("date", "type"),
        )

        self.stdout.write(self.style.SUCCESS("Done."))

    def parse_ingredients(self, ingredients_div):
        list_items = ingredients_div.find_all("li")
        return [i.text.strip() for i in list_items]

    def parse_meal(self, row) -> Meal:
        def parse(css_class):
            div = row.find("div", {"class": css_class})
            if not div:
                raise CommandError(f"No {css_class} found in {row}")
            return div

        ingredients = self.parse_ingredients(parse("recipe-lists"))
        quantities = self.parse_quantities(parse("quantity-bar"))
        nutritional_values = self.parse_nutritional_values(parse("menu-pic").table)
        return Meal(
            name=row.h4.text,
            type=TYPE_MAPPING[row.h2.text.lower()],
            ingredients=ingredients,
            quantities=quantities,
            nutritional_values=nutritional_values,
        )

    def parse_nutritional_values(self, nutritional_div):
        results = {}
        values = [x.text.strip() for x in nutritional_div.find_all("td")][2:]
        while values:
            results[values.pop()] = values.pop()
        return results

    def parse_quantities(self, quantities_div):
        quantities, grams = quantities_div.find_all("ul")
        quantities = [q.text.strip() for q in quantities if q.text.strip()]
        grams = [g.text.strip() for g in grams if g.text.strip()]
        return dict(zip(quantities, grams))
