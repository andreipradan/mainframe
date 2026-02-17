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
    is_active = models.BooleanField(default=False)
    latest = models.JSONField(default=dict)
    pending_data = models.JSONField(default=list)
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

        try:
            results = fetcher(self, logger)
        except WatcherElementsNotFound as e:
            logger.warning(e)
            return []
        if not (self.latest and self.latest.get("timestamp")):
            return results[:5]

        if not (latest_url := self.latest.get("url")):
            return results[:5]

        for i, result in enumerate(results):
            if result["url"] == latest_url:
                if result["title"] != self.latest.get("title"):
                    return results[: i + 1][:5]
                return results[:i][:5]

        return results[:5]

    def run(self):
        logger = logging.getLogger(__name__)
        with capture_command_logs(logger, self.log_level, span_name=str(self)):
            matching_cron = (
                croniter.match(self.cron, timezone.now())
                if self.cron_notification
                else True
            )
            if self.pending_data and matching_cron:
                logger.info("[%s] Sending pending data", self.name)
                self.send_notification(self.pending_data, muted=True)
                self.pending_data = []
                self.save()

            if not (results := self.fetch(logger)):
                logger.info("[%s] No new items", self.name)
                return None

            logger.info("[%s] Found new items!", self.name)

            urgent_keywords = ("breaking", "urgent", "alert", "ultima", "ultimă")
            if any(
                result["title"].lower().startswith(urgent_keywords)
                for result in results
            ):
                logger.info(
                    "[%s] Urgent items detected, sending immediately", self.name
                )
                self.send_notification(results, muted=False)
            elif matching_cron:
                logger.info("[%s] Cron matched, sending notification", self.name)
                self.send_notification(results, muted=False)
            else:
                logger.info(
                    "[%s] Deferring notification to next cron window", self.name
                )
                self._accumulate_pending_data(results, logger)

            result = results[0]
            self.latest = {
                "title": result["title"],
                "url": result["url"],
                "timestamp": timezone.now().isoformat(),
            }
            self.save()

            logger.info("[%s] Done", self.name)
            return self

    def _accumulate_pending_data(self, new_results: list[Link], logger) -> None:
        """Accumulate new results into pending_data
        but only keep what fits in a Telegram message.

        Respects Telegram's 4096 character limit, accounting for header and footer.
        Keeps newest items first (in order), dropping oldest items that don't fit.
        """
        TELEGRAM_LIMIT = 4096
        combined = new_results + self.pending_data

        # Build header and footer (same format as send_notification)
        header = f"📣 <b>{self.name}</b> 📣\n"
        url = self.url
        if ".json" in url:
            url = url[: url.index(".json")]
        footer = f"\nMore articles: <a href='{url}'>here</a>"

        kept_items = []
        current_text_length = 0

        for item in combined:
            # Format item as it appears in message
            is_first = len(kept_items) == 0
            prefix = "" if is_first else f"{len(kept_items) + 1}. "
            item_html = (
                f"{prefix}<a href='{item['url']}' target='_blank'>{item['title']}</a>"
            )

            item_with_separator = item_html if is_first else f"\n{item_html}"
            item_length = len(item_with_separator)
            if current_text_length + item_length <= TELEGRAM_LIMIT - len(header) + len(
                footer
            ):
                kept_items.append(item)
                current_text_length += item_length
            else:
                # Doesn't fit, we're done accumulating
                if len(combined) > len(kept_items):
                    dropped_count = len(combined) - len(kept_items)
                    logger.warning(
                        "[%s] Dropped %d items. Telegram message size limit: %d chars",
                        self.name,
                        dropped_count,
                        TELEGRAM_LIMIT,
                    )
                break

        self.pending_data = kept_items

    def send_notification(self, results, muted=False):
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
        kwargs = {"parse_mode": ParseMode.HTML}
        if self.chat_id:
            kwargs["chat_id"] = self.chat_id
        if muted:
            kwargs["disable_notification"] = True

        header = f"📣 <b>{self.name}</b> 📣\n"
        footer = f"\nMore articles: <a href='{url}'>here</a>"

        asyncio.run(send_telegram_message(f"{header}{text}{footer}", **kwargs))


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
