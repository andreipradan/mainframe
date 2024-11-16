import telegram
from asgiref.sync import sync_to_async
from mainframe.bots.models import Bot
from mainframe.clients.logs import get_default_logger
from mainframe.clients.storage import RedisClient
from telegram.constants import ParseMode


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
            self.logger.warning("Not whitelisted: %s", update.effective_user)
            return
        return await func(self, update, context)

    return wrapper


class BaseBotMeta(type):
    def __new__(cls, name, bases, dct):
        excepted_methods = ["__init__", "reply"]
        for key, value in dct.items():
            if key not in excepted_methods and callable(value):
                dct[key] = is_whitelisted(value)
        return super().__new__(cls, name, bases, dct)


class BaseBotClient(metaclass=BaseBotMeta):
    def __init__(self, logger=None):
        self.logger = logger or get_default_logger(__name__)
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
                    "Error parsing markdown - skipping '%s'", text[location]
                )
                return await self.reply(
                    message, f"{text[:location]}\\{text[location]}{text[location + 1:]}"
                )
            self.logger.warning("Couldn't send markdown '%s'. (%s)", text, e)
            try:
                await message.reply_text(text)
            except telegram.error.TelegramError as err:
                self.logger.exception("Error sending unformatted message. (%s)", err)
                await message.reply_text("Got an error trying to send response")
