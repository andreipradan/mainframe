from collections import deque

import requests
from bs4 import BeautifulSoup
from django.conf import settings
from django.core.management import call_command
from huey import crontab
from huey.contrib.djhuey import HUEY, db_periodic_task, periodic_task

from bots.models import Bot
from clients import healthchecks


@db_periodic_task(crontab(minute=59, hour=23, day=2))
@HUEY.lock_task("backup-bots-lock")
def backup_bots():
    call_command("backup", app="bots")


@periodic_task(crontab(minute="*/5"))
@HUEY.lock_task("healthcheck-lock")
def healthcheck():
    healthchecks.ping()


@db_periodic_task(crontab(minute=0, hour=19))
@HUEY.lock_task("who-s-next-reminder-lock")
def who_s_next_reminder():
    def fetch_tomorrow(url):
        soup = BeautifulSoup(requests.get(url).content, parser="html")
        tomorrow = soup.find(id="calendar-azi").find_next_sibling()
        if not tomorrow:
            url = soup.li.find_next_sibling().a.attrs["href"]
            soup = BeautifulSoup(requests.get(url).content, parser="html")
            tomorrow = soup.tr
        if not tomorrow.th:
            tomorrow = tomorrow.find_next_sibling()
        day = tomorrow.th.text.strip()
        week_day = tomorrow.th.find_next_sibling().text.strip()
        red = " 🔴" if "red" in tomorrow.attrs["class"] or week_day == "D" else ""
        return f"[{day} {week_day}{red}] <a href='{tomorrow.a.attrs['href']}'>{tomorrow.a.text}</a>"

    if settings.ENV != "prod":
        return
    bot = Bot.objects.get(additional_data__whos_next__isnull=False)
    config = bot.additional_data["whos_next"]
    config["theme"] = fetch_tomorrow(config["url"])
    post_order = config["post_order"]
    if not config["posted"]:
        text = (
            f"Ei ceapa ta <b>{post_order[0]} 😒</b>\nMâine tot tu tre sa bagi\n"
            f"{config['theme']}\n"
            f"Mai multe <a href='{config['url']}'>aici</a>"
        )
    else:
        text = (
            f"Bravo <b>{post_order[0]}</b>!👏\nUrmează: <b>{post_order[1]}</b>\n"
            f"{config['theme']}\n"
            f"Mai multe <a href='{config['url']}'>aici</a>"
        )

        post_order = deque(post_order)
        post_order.rotate(-1)
        config["post_order"] = list(post_order)
        config["posted"] = False
    bot.save()
    bot.send_message(chat_id=config["chat_id"], text=text)
