import logging
import random
from collections import deque

import requests
from bs4 import BeautifulSoup
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from mainframe.bots.models import Bot
from mainframe.clients.logs import ManagementCommandsHandler


class Sources:
    @staticmethod
    def fetch_tomorrow(url):
        soup = BeautifulSoup(
            requests.get(url, timeout=30).content, features="html.parser"
        )
        tomorrow = soup.find(id="calendar-azi").find_next_sibling()
        if not tomorrow:
            url = soup.li.find_next_sibling().a.attrs["href"]
            response = requests.get(url, timeout=30)
            soup = BeautifulSoup(response.content, features="html.parser")
            tomorrow = soup.tr
        if not tomorrow.th:
            tomorrow = tomorrow.find_next_sibling()
        day = tomorrow.th.text.strip()
        week_day = tomorrow.th.find_next_sibling().text.strip()
        red = " 🔴" if "red" in tomorrow.attrs["class"] or week_day == "D" else ""
        prefix = f"[{day} {week_day}{red}]"
        return f"{prefix} <a href='{tomorrow.a.attrs['href']}'>{tomorrow.a.text}</a>"

    @staticmethod
    def fetch_word():
        dex_url = "https://dexonline.ro/definitie/{}/json"
        min_len = 5
        data_path = settings.BASE_DIR / "bots" / "management" / "commands" / "data"
        with open(data_path / "ro-words.txt", "r") as file:
            while len(word := random.choice(file.readlines())) < min_len:  # noqa: S311
                ...

        word = word.strip()
        response = requests.get(dex_url.format(word), timeout=10)
        response.raise_for_status()
        response = response.json()
        definition = BeautifulSoup(response["definitions"][0]["htmlRep"], "html.parser")
        for tag_name in ["abbr", "span", "sup"]:
            for tag in definition.find_all(tag_name):
                tag.replace_with(tag.text)
        return definition.text.split(",")[0], definition


def whos_next(config):
    if not isinstance(config, dict):
        raise CommandError("Invalid whos_next config")
    if not (post_order := config.get("post_order")):
        raise CommandError("post_order missing from whos_next in bot additional data")
    if not isinstance(post_order, list):
        raise CommandError("post_order not a list")
    if len(post_order) != 3:  # noqa: PLR2004
        raise CommandError("post_order must contain 3 items")

    if posted := config.get("posted"):
        prev, current, _ = post_order
    else:
        current, _, prev = post_order

    if config.get("initial"):
        previous_msg = "Pfuui...no bun.\nIncepe: "
    else:
        previous_msg = f"A fost: <b>{prev}</b>\nUrmează: "

    msg = f"{previous_msg}<b>{current}</b>"
    theme = config.get("theme")
    if theme:
        msg += f"\nCuvântu' e: {theme}"
        if posted:
            msg += "\nNoua tema se anunta la 9 PM"
    if url := config.get("url"):
        msg += f"\nMai multe <a href='{url}'>aici</a>"
    return msg


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())
        logger.info("Checking who's next")

        bot = Bot.objects.get(additional_data__whos_next__isnull=False)
        config = bot.additional_data["whos_next"]
        if not (chat_id := config.get("chat_id")):
            raise CommandError("Missing chat_id in whos_next config")

        word, definition = Sources.fetch_word()
        config["theme"] = f"<b>{word}</b>\n\n{definition}"
        config["url"] = f"https://dexonline.ro/definitie/{word}"
        post_order = config["post_order"]

        if config.get("initial"):
            text = (
                f"Pfuui no bun.\n"
                f"Incepe: <b>{post_order[0]}</b> 🥳\n"
                f"Cuvântu' e: {config['theme']}"
            )
        elif not config["posted"]:
            text = (
                f"Ei ceapa ta <b>{post_order[0]} 😒</b>\nMâine tot tu tre sa bagi\n"
                f"Cuvântu' e: {config['theme']}"
            )
        else:
            text = (
                f"Bravo <b>{post_order[0]}</b>!👏\nUrmează: <b>{post_order[1]}</b>\n"
                f"Cuvântu' e: {config['theme']}"
            )

            post_order = deque(post_order)
            post_order.rotate(-1)
            config["initial"] = False
            config["post_order"] = list(post_order)
            config["posted"] = False
        bot.save()

        text += f"\n\nMai multe <a href='{config['url']}'>aici</a>"
        bot.send_message(chat_id=chat_id, text=text)
        self.stdout.write(self.style.SUCCESS("Done."))
