import asyncio
import logging
from typing import TypedDict
from urllib.parse import urljoin

from croniter import croniter
from django.conf import settings
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


class Link(TypedDict):
    title: str
    url: str


class WatcherError(Exception): ...


class WatcherElementsNotFound(WatcherError): ...


def extract(structure, keys):
    if len(keys) == 1:
        return structure[keys[0]]
    return extract(structure[keys[0]], keys[1:])


def fetch_api(watcher, logger) -> list[Link]:
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


def fetch_web(watcher, logger) -> list[Link]:
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
                "url": str(urljoin(watcher.url, e.attrs["href"]))
                if not e.attrs["href"].startswith("http")
                else e.attrs["href"],
            }
            for e in elements
            if get_title(e)
        ]
    if error:
        raise WatcherError(error)
    raise WatcherElementsNotFound(f"[{watcher.name}] No elements found")


class Watcher(TimeStampedModel):
    TYPE_API = 1
    TYPE_WEB = 2

    TYPE_CHOICES = ((TYPE_API, "API"), (TYPE_WEB, "Web"))

    chat_id = models.BigIntegerField(blank=True, null=True)
    cron = models.CharField(blank=True, max_length=32)
    cron_notification = models.CharField(blank=True, max_length=32)
    has_new_data = models.BooleanField(default=False)
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
        fetcher = {
            self.TYPE_API: fetch_api,
            self.TYPE_WEB: fetch_web,
        }.get(self.type)
        if not fetcher:
            raise WatcherError(f"Unexpected watcher type: {self.type}")

        results = fetcher(self, logger)
        if not (self.latest and self.latest.get("timestamp")):
            return results[:5]

        if not ((latest := next(iter(self.latest.get("data") or []), {})).get("url")):
            return results[:5]

        for i, result in enumerate(results):
            if result["url"] == latest["url"]:
                if result["title"] != latest["title"]:
                    return results[: i + 1][:5]
                return results[:i][:5]

        return results[:5]

    def run(self):
        logger = logging.getLogger(__name__)
        with capture_command_logs(logger, self.log_level, span_name=str(self)):
            if not (results := self.fetch(logger)):
                logger.info("No new items")
                if self.should_notify():
                    self.send_notification(self.latest["data"])
                    self.has_new_data = False
                    self.save()
                    return None
                return None

            logger.info("Found new items!")
            if self.should_notify(results):
                self.send_notification(results)
                self.has_new_data = False
            else:
                self.has_new_data = True

            self.latest = {"data": results, "timestamp": timezone.now().isoformat()}
            self.save()

            logger.info("Done")
            return self

    def send_notification(self, results):
        text = "\n".join(
            [
                f"{f'{i + 1}. ' if len(results) > 1 else ''}"
                f"<a href='{result['url']}' target='_blank'>{result['title']}</a>"
                for i, result in enumerate(results)
            ]
        )
        url = self.url
        if ".json" in url:
            url = url[: url.index(".json")]
        text = text + f"\nMore articles: <a href='{url}'>here</a>"
        kwargs = {"parse_mode": ParseMode.HTML}
        if self.chat_id:
            kwargs["chat_id"] = self.chat_id
        asyncio.run(
            send_telegram_message(f"📣 <b>{self.name}</b> 📣\n{text}", **kwargs)
        )

    def should_notify(self, results=None) -> bool:
        if not results:
            return self.has_new_data

        if not self.cron_notification:
            return True

        if any(
            result["title"].lower().startswith("breaking")
            or result["title"].lower().startswith("ultima or")
            for result in results
        ):
            return True

        return croniter.match(self.cron_notification, timezone.now())


@receiver(signals.post_delete, sender=Watcher)
def post_delete(sender, instance, **kwargs):  # noqa: PYL-W0613,
    if settings.ENV != "local":
        instance.cron = ""
        schedule_task(instance)


@receiver(signals.post_save, sender=Watcher)
def post_save(sender, instance, **kwargs):  # noqa: PYL-W0613,
    if settings.ENV != "local":
        if getattr(instance, "is_renamed", False):  # set in core/serializers.py update
            instance.cron = ""
        schedule_task(instance)
