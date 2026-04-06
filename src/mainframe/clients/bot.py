import asyncio
from typing import Callable

import structlog
import telegram
from asgiref.sync import sync_to_async
from telegram.constants import ParseMode

from mainframe.bots.models import Bot
from mainframe.clients.storage import RedisClient


def is_whitelisted(func):
    async def wrapper(self, update, context):
        try:
            await sync_to_async(Bot.objects.get)(
                username=context.bot.username,
                whitelist__contains=[
                    update.effective_user.username or update.effective_user.id
                ],
            )
        except Bot.DoesNotExist:
            self.logger.warning(
                "User not whitelisted",
                user_id=str(
                    update.effective_user.id if update.effective_user else None
                ),
                username=update.effective_user.username or update.effective_user.id,
            )
            return
        return await func(self, update, context)

    return wrapper


class BaseBotMeta(type):
    def __new__(mcs, name, bases, dct):
        excepted_methods = ["__init__", "reply", "safe_send"]
        for key, value in dct.items():
            if key not in excepted_methods and callable(value):
                dct[key] = is_whitelisted(value)
        return super().__new__(mcs, name, bases, dct)


class BaseBotClient(metaclass=BaseBotMeta):
    def __init__(self, logger=None):
        self.logger = logger or structlog.get_logger(__name__)
        self.redis = RedisClient(self.logger)

    async def reply(self, message: telegram.Message, text: str, **kwargs):
        if not message:
            return self.logger.error("Can't reply - message is empty")

        default_kwargs = {
            "disable_notification": True,
            "disable_web_page_preview": True,
            "parse_mode": ParseMode.HTML,
            **kwargs,
        }
        try:
            await message.reply_text(text, **default_kwargs)
        except telegram.error.TelegramError as e:
            if "can't find end of the entity" in str(e):
                location = int(e.message.split()[-1])
                self.logger.warning(
                    "Error parsing markdown - skipping character",
                    location=location,
                    char=text[location],
                )
                return await self.reply(
                    message,
                    f"{text[:location]}\\{text[location]}{text[location + 1 :]}",
                )
            self.logger.warning("Couldn't send markdown", text=text, error=str(e))
            try:
                await message.reply_text(text)
            except telegram.error.TelegramError as err:
                self.logger.exception(
                    "Error sending unformatted message", error=str(err)
                )
                await message.reply_text("Got an error trying to send response")

    async def safe_send(self, send_message: Callable, **kwargs):
        try:
            return await send_message(**kwargs)
        except telegram.error.TelegramError as err:
            if isinstance(err, telegram.error.RetryAfter):
                seconds = err.retry_after + 1
                self.logger.warning(
                    "Error sending message - rate limited, retrying in a few seconds",
                    error=str(err),
                    extra=kwargs,
                    seconds=seconds,
                )
                await asyncio.sleep(seconds)
                return await send_message(send_message, **kwargs)
            if isinstance(err, telegram.error.TimedOut):
                self.logger.warning("Timed out - retrying", extra=kwargs)
                return await send_message(send_message, **kwargs)
            raise
