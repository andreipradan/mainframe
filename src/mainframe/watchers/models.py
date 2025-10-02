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


def extract(structure, keys):
    if len(keys) == 1:
        return structure[keys[0]]
    return extract(structure[keys[0]], keys[1:])


def fetch_api(watcher, logger):
    response, error = fetch(
        watcher.url, logger, retries=1, soup=False, **watcher.request
    )
    if error:
        raise WatcherError(error)

    results = response.json()
    try:
        list_selector, title_selector, url_selector = watcher.selector.split(" ")
    except ValueError as e:
        raise WatcherError(
            "API type Watchers must have dotted list, title and url "
            "selectors separated by space"
        ) from e

    if not all((list_selector, title_selector, url_selector)):
        raise WatcherError("Missing one of the selectors")

    try:
        return [
            {
                "title": extract(result, title_selector.split(".")),
                "url": extract(result, url_selector.split(".")),
            }
            for result in extract(results, list_selector.split("."))
        ]
    except (IndexError, ValueError) as e:
        raise WatcherError(e) from e


def fetch_web(watcher, logger, retry=False):
    def get_title(element):
        return (
            element.text.strip()
            or element.attrs.get("title")
            or element.attrs.get("aria-label")
        )

    soup, error = fetch(watcher.url, logger, retries=1, **watcher.request)
    if soup and (elements := soup.select(watcher.selector)):
        return [
            {
                "title": get_title(e),
                "url": urljoin(watcher.url, e.attrs["href"])
                if not e.attrs["href"].startswith("http")
                else e.attrs["href"],
            }
            for e in elements
            if get_title(e)
        ]
    if error:
        raise WatcherError(error)
    if retry:
        logger.warning("Elements not found ('%s') - retrying", watcher.selector)
        return fetch_web(watcher, logger, retry=False)
    raise WatcherElementsNotFound(f"[{watcher.name}] No elements found")


class Watcher(TimeStampedModel):
    TYPE_API = 1
    TYPE_WEB = 2

    TYPE_CHOICES = ((TYPE_API, "API"), (TYPE_WEB, "Web"))

    chat_id = models.BigIntegerField(blank=True, null=True)
    cron = models.CharField(blank=True, max_length=32)
    is_active = models.BooleanField(default=False)
    latest = models.JSONField(default=dict)
    log_level = models.IntegerField(default=logging.WARNING)
    name = models.CharField(max_length=255, unique=True)
    request = models.JSONField(default=dict)
    selector = models.CharField(max_length=128)
    type = models.IntegerField(
        choices=TYPE_CHOICES,
        default=TYPE_WEB,
    )
    url = models.URLField()

    def __str__(self):
        return self.name

    def fetch(self, logger):
        if self.type == self.TYPE_API:
            results = fetch_api(self, logger)
        elif self.type == self.TYPE_WEB:
            results = fetch_web(self, logger, retry=True)
        else:
            raise WatcherError(f"Unexpected watcher type: {self.type}")

        if not self.latest.get("title"):
            return results[:5]

        for i, result in enumerate(results):
            if result["title"] == self.latest["title"]:
                return results[:i][:5]

        return results[:5]

    def run(self):
        logger = logging.getLogger(__name__)
        with capture_command_logs(logger, self.log_level, span_name=str(self)):
            results = self.fetch(logger)
            if not results:
                logger.info("No new items")
                return False

            self.latest = {
                "title": results[0]["title"],
                "url": results[0]["url"],
                "timestamp": timezone.now().isoformat(),
            }
            self.save()

            logger.info("Found new items!")
            text = "\n".join(
                [
                    f"{f'{i + 1}. ' if len(results) > 1 else ''}"
                    f"<a href='{result['url']}' target='_blank'>{result['title']}</a>"
                    for i, result in enumerate(results)
                ]
            )
            text = text + f"\n\nMore articles: <a href='{self.url}'>here</a>"
            kwargs = {"parse_mode": ParseMode.HTML}
            if self.chat_id:
                kwargs["chat_id"] = self.chat_id
            asyncio.run(
                send_telegram_message(f"📣 <b>{self.name}</b> 📣\n{text}", **kwargs)
            )
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
