import logging
from urllib.parse import urljoin

import requests
import telegram
from bs4 import BeautifulSoup
from django.db import models
from django.db.models import signals
from django.dispatch import receiver
from django.utils import timezone
from huey import crontab
from huey.contrib.djhuey import HUEY, periodic_task, task

from clients.chat import send_telegram_message
from clients.logs import MainframeHandler
from core.models import TimeStampedModel
from core.tasks import log_status

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


class Watcher(TimeStampedModel):
    cron = models.CharField(blank=True, max_length=32)
    latest = models.JSONField(default=dict)
    name = models.CharField(max_length=255, unique=True)
    request = models.JSONField(default=dict)
    selector = models.CharField(max_length=128)
    top = models.BooleanField(default=True)
    url = models.URLField()

    def __str__(self):
        return self.name

    def run(self):
        logger.info("[%s] Running", self.name)
        response = requests.get(self.url, timeout=10, **self.request)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        elements = soup.select(self.selector)
        if not elements:
            raise ValueError(f"[{self.name}] Watcher did not found any elements")

        if self.latest.get("title") != (found := elements[0 if self.top else -1]).text:
            url = (
                urljoin(self.url, found.attrs["href"])
                if found.attrs["href"].startswith("/")
                else found.attrs["href"]
            )
            self.latest = {
                "title": found.text,
                "url": url,
                "timestamp": timezone.now().isoformat(),
            }
            self.save()

            message = "Found new item!"
            logger.info("[%s] Done - %s", self.name, message)
            log_status(self.name, msg=message)
            text = (
                f"📣 <b>New <i>{self.name}</i> found!</b> 📣\n"
                f"<a href='{url}'>{found.text}</a>\n"
                f"All items <a href='{self.url}'>here</a>"
            )
            send_telegram_message(text, parse_mode=telegram.ParseMode.HTML)
            return message

        message = "No new items found"
        logger.info("[%s] Done - %s", self.name, message)
        return message


@task()
def schedule_watcher(watcher: Watcher):
    def wrapper():
        watcher.run()

    task_name = f"watchers.models.{watcher.name}"
    if task_name in HUEY._registry._registry:
        task_class = HUEY._registry.string_to_task(task_name)
        HUEY._registry.unregister(task_class)
        logger.info("Unregistered task: %s", watcher.name)
    if watcher.cron:
        schedule = crontab(*watcher.cron.split())
        periodic_task(schedule, name=watcher.name)(wrapper)
        logger.info("Scheduled task: %s", watcher.name)


@receiver(signals.post_delete, sender=Watcher)
def post_delete(sender, instance, **kwargs):
    instance.cron = ""
    schedule_watcher(instance)


@receiver(signals.post_save, sender=Watcher)
def post_save(sender, instance, **kwargs):
    schedule_watcher(instance)
