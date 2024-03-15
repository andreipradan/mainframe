import logging
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand

from bots.models import Bot
from clients.logs import ManagementCommandsHandler


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = logging.getLogger(__name__)
        logger.addHandler(ManagementCommandsHandler())
        logger.info("Checking new fidelis articles")

        bot = Bot.objects.get(additional_data__fidelis__isnull=False)
        config = bot.additional_data["fidelis"]

        response = requests.get(config["url"], headers={"User-Agent": "foo"})
        soup = BeautifulSoup(response.text, "html.parser")
        last_article = soup.find("div", {"class": "journal-content-article"}).p.a
        title, href = last_article.text, last_article.attrs["href"]
        if config.get("latest", {}).get("title") != title:
            config["latest"] = {
                "title": last_article.text,
                "url": last_article.attrs["href"],
            }

            text = (
                f"📣 <b>New fidelis article</b> 📣\n"
                f"<a href='{urljoin(config['url'], href)}'>{title}</a>\n"
                f"All articles <a href='{config['url']}'>here</a>"
            )
            bot.send_message(chat_id=bot.additional_data["debug_chat_id"], text=text)
            bot.save()
        else:
            logger.info("Nothing new")

        self.stdout.write(self.style.SUCCESS("Done."))
