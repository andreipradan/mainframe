import asyncio
from urllib.parse import urljoin

from django.db import models
from django.db.models import signals
from django.dispatch import receiver
from django.utils import timezone
from mainframe.clients.chat import send_telegram_message
from mainframe.clients.logs import get_default_logger
from mainframe.clients.scraper import fetch
from mainframe.core.models import TimeStampedModel
from mainframe.core.tasks import schedule_task
from opentelemetry import trace
from telegram.constants import ParseMode

logger = get_default_logger(__name__)
tracer = trace.get_tracer(__name__)


class WatcherError(Exception):
    ...


class WatcherElementsNotFound(WatcherError):
    ...


class Watcher(TimeStampedModel):
    chat_id = models.BigIntegerField(blank=True, null=True)
    cron = models.CharField(blank=True, max_length=32)
    is_active = models.BooleanField(default=False)
    latest = models.JSONField(default=dict)
    name = models.CharField(max_length=255, unique=True)
    request = models.JSONField(default=dict)
    selector = models.CharField(max_length=128)
    top = models.BooleanField(default=True)
    url = models.URLField()

    def __str__(self):
        return self.name

    def run(self):
        with tracer.start_as_current_span(self):

            def get_elements(retry=False):
                soup, error = fetch(
                    self.url, logger=logger, retries=1, timeout=10, **self.request
                )
                if soup and (items := soup.select(self.selector)):
                    return items
                if retry:
                    logger.warning("No elements found - retrying")
                    return get_elements(retry=False)
                if error:
                    raise WatcherError(error)
                raise WatcherElementsNotFound(f"[{self.name}] No elements found")

            elements = get_elements(retry=True)
            found = elements[0 if self.top else -1]
            if self.latest.get("title") == (title := found.text.strip()):
                logger.info("No new items")
                return False
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
                f"More articles: <a href='{self.url}'>here</a>"
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
