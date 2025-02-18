import asyncio
import logging
from urllib.parse import urljoin

from django.db import models
from django.db.models import signals
from django.dispatch import receiver
from django.utils import timezone
from telegram.constants import ParseMode

from mainframe.clients.chat import send_telegram_message
from mainframe.clients.scraper import fetch
from mainframe.core.logs import capture_command_logs
from mainframe.core.models import TimeStampedModel
from mainframe.core.tasks import schedule_task


class WatcherError(Exception): ...


class WatcherElementsNotFound(WatcherError): ...


def fetch_element(watcher, logger, retry=False):
    soup, error = fetch(watcher.url, logger, retries=1, timeout=10, **watcher.request)
    if soup and (element := soup.select_one(watcher.selector)):
        return element
    if retry:
        logger.warning("Element '%s' not found - retrying", watcher.selector)
        return fetch_element(watcher, logger, retry=False)
    if error:
        raise WatcherError(error)
    raise WatcherElementsNotFound(f"[{watcher.name}] No elements found")


class Watcher(TimeStampedModel):
    chat_id = models.BigIntegerField(blank=True, null=True)
    cron = models.CharField(blank=True, max_length=32)
    is_active = models.BooleanField(default=False)
    latest = models.JSONField(default=dict)
    log_level = models.IntegerField(default=logging.WARNING)
    name = models.CharField(max_length=255, unique=True)
    request = models.JSONField(default=dict)
    selector = models.CharField(max_length=128)
    top = models.BooleanField(default=True)
    url = models.URLField()

    def __str__(self):
        return self.name

    def run(self):
        logger = logging.getLogger(__name__)
        with capture_command_logs(logger, self.log_level, span_name=str(self)):
            element = fetch_element(self, logger, retry=True)
            if self.latest.get("title") == (
                title := (element.text.strip() or element.attrs.get("title"))
            ):
                logger.info("No new items")
                return False
            url = (
                urljoin(self.url, element.attrs["href"])
                if not element.attrs["href"].startswith("http")
                else element.attrs["href"]
            )
            self.latest = {
                "title": title,
                "url": url,
                "timestamp": timezone.now().isoformat(),
            }
            self.save()

            logger.info("Found new item!")
            text = (
                f"<a href='{url}'>{title}</a>"
                f"\nMore articles: <a href='{self.url}'>here</a>"
            )
            kwargs = {"parse_mode": ParseMode.HTML}
            if self.chat_id:
                kwargs["chat_id"] = self.chat_id
            else:
                text = f"📣 <b>{self.name}</b> 📣\n{text}"
            asyncio.run(send_telegram_message(text, **kwargs))
            logger.info("Done")
            return self


@receiver(signals.post_delete, sender=Watcher)
def post_delete(sender, instance, **kwargs):  # noqa: PYL-W0613
    instance.cron = ""
    schedule_task(instance)


@receiver(signals.post_save, sender=Watcher)
def post_save(sender, instance, **kwargs):  # noqa: PYL-W0613
    if getattr(instance, "is_renamed", False):  # set in core/serializers.py update
        instance.cron = ""
    schedule_task(instance)
