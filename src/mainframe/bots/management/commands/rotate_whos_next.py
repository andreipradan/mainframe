from collections import deque

from django.core.management.base import BaseCommand, CommandError
from mainframe.bots.models import Bot
from mainframe.clients import dexonline
from mainframe.clients.logs import get_default_logger
from mainframe.clients.scraper import fetch

logger = get_default_logger(__name__)


class Sources:
    @staticmethod
    def fetch_tomorrow(url):
        soup, error = fetch(url, logger, timeout=30)
        if not soup or error:
            raise CommandError(error)

        tomorrow = soup.find(id="calendar-azi").find_next_sibling()
        if not tomorrow:
            url = soup.li.find_next_sibling().a.attrs["href"]
            soup, _ = fetch(url, logger, timeout=30)
            tomorrow = soup.tr
        if not tomorrow.th:
            tomorrow = tomorrow.find_next_sibling()
        day = tomorrow.th.text.strip()
        week_day = tomorrow.th.find_next_sibling().text.strip()
        red = " 🔴" if "red" in tomorrow.attrs["class"] or week_day == "D" else ""
        prefix = f"[{day} {week_day}{red}]"
        return f"{prefix} <a href='{tomorrow.a.attrs['href']}'>{tomorrow.a.text}</a>"


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
    if theme := config.get("theme"):
        msg += f"\nTema {'a fost' if posted else 'e'}: {theme}"
        if url := config.get("url"):
            msg += f"\nMai multe <a href='{url}'>aici</a>"
        if posted:
            msg += "\n\nNoua tema se anunta la 9 PM"
    return msg


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = get_default_logger(__name__)

        logger.info("Checking who's next")

        bot = Bot.objects.get(additional_data__whos_next__isnull=False)
        config = bot.additional_data["whos_next"]
        if not (chat_id := config.get("chat_id")):
            raise CommandError("Missing chat_id in whos_next config")

        word, definition = dexonline.fetch_definition()
        config["theme"] = f"<b>{word}</b>\n\n{definition}"
        config["url"] = f"https://dexonline.ro/definitie/{word}"
        post_order = config["post_order"]

        if config.get("initial"):
            text = (
                f"Pfuui no bun.\n"
                f"Incepe: <b>{post_order[0]}</b> 🥳\n"
                f"Tema e: {config['theme']}"
            )
        elif not config["posted"]:
            text = (
                f"Ei ceapa ta <b>{post_order[0]} 😒</b>\n"
                "Tot tu tre sa bagi, dar alt cuvânt\n"
                f"Tema e: {config['theme']}"
            )
        else:
            text = (
                f"Bravo <b>{post_order[0]}</b>!👏\nUrmează: <b>{post_order[1]}</b>\n"
                f"Tema e: {config['theme']}"
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
