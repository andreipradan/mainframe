from urllib.parse import urljoin

import logfire
import requests
import telegram
from bs4 import BeautifulSoup
from django.db import models
from django.db.models import signals
from django.dispatch import receiver
from django.utils import timezone
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.logs import get_default_logger
from mainframe.core.models import TimeStampedModel
from mainframe.core.tasks import schedule_task

logger = get_default_logger(__name__)


class Watcher(TimeStampedModel):
    chat_id = models.BigIntegerField(blank=True, null=True)
    cron = models.CharField(blank=True, max_length=32)
    latest = models.JSONField(default=dict)
    name = models.CharField(max_length=255, unique=True)
    request = models.JSONField(default=dict)
    selector = models.CharField(max_length=128)
    top = models.BooleanField(default=True)
    url = models.URLField()

    def __str__(self):
        return self.name

    @logfire.instrument("[{self}] - Running watcher")
    def run(self):
        with logfire.span(f"Requesting {self.url}", **self.request):
            response = requests.get(self.url, timeout=10, **self.request)
        with logfire.span("Validating status", response=response):
            response.raise_for_status()
            logger.info("Status: %s", response.status_code)

        with logfire.span("Checking for element", selector=self.selector):
            soup = BeautifulSoup(response.text, "html.parser")
            elements = soup.select(self.selector)
            if not elements:
                raise ValueError(f"[{self.name}] Watcher did not found any elements")
            logger.info("Found it!")

        with logfire.span("Checking if the element is new"):
            found = elements[0 if self.top else -1]
            if self.latest.get("title") == (title := found.text.strip()):
                logger.info("No new items")
                return
            url = (
                urljoin(self.url, found.attrs["href"])
                if not found.attrs["href"].startswith("http")
                else found.attrs["href"]
            )
            self.latest = {
                "title": title,
                "url": url,
                "timestamp": timezone.now().isoformat(),
            }
            self.save()

            logger.info("Found new item!")
            text = (
                f"<a href='{url}'>{title}</a>\n"
                f"All items <a href='{self.url}'>here</a>"
            )
            kwargs = {"parse_mode": telegram.ParseMode.HTML}
            if self.chat_id:
                kwargs["chat_id"] = self.chat_id
            else:
                text = f"📣 <b>New <i>{self.name}</i> item!</b> 📣\n{text}"
            send_telegram_message(text, **kwargs)
            logger.info("Done")
            return True


@receiver(signals.post_delete, sender=Watcher)
def post_delete(sender, instance, **kwargs):
    instance.cron = ""
    schedule_task(instance)


@receiver(signals.post_save, sender=Watcher)
def post_save(sender, instance, **kwargs):
    schedule_task(instance)
