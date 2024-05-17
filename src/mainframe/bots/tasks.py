import random

import requests
from bs4 import BeautifulSoup
from django.conf import settings
from django.core.management import call_command
from huey import crontab
from huey.contrib.djhuey import HUEY, db_periodic_task, periodic_task
from mainframe.bots.models import Bot
from mainframe.clients import healthchecks


@db_periodic_task(crontab(minute=59, hour=23, day=2))
@HUEY.lock_task("backup-bots-lock")
def backup_bots():
    call_command("backup", app="bots")


@periodic_task(crontab(minute="*/5"))
@HUEY.lock_task("healthcheck-lock")
def healthcheck():
    if settings.ENV != "prod":
        return
    healthchecks.ping()


@db_periodic_task(crontab(minute=30, hour=6))
@HUEY.lock_task("word-of-the-day-lock")
def word_of_the_day():
    if settings.ENV != "prod":
        return

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
    bot = Bot.objects.get(additional_data__whos_next__isnull=False)

    bot.send_message(
        chat_id=bot.additional_data["whos_next"]["chat_id"],
        text=f"📖 Cuvântu' de azi: <b>{word}</b> 📖\n\n{definition}",
    )
