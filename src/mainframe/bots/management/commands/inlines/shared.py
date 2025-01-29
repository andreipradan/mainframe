import logging

import six
import telegram
from telegram.constants import ParseMode

from mainframe.clients.chat import edit_message

logger = logging.getLogger(__name__)


class BaseInlines:
    @classmethod
    async def end(cls, update):
        bot = update.callback_query.bot
        message = update.callback_query.message
        await edit_message(
            bot,
            chat_id=update.message.chat_id,
            message_id=message.message_id,
            text="See you next time!",
        )

    @classmethod
    def get_markup(cls, **kwargs):
        raise NotImplementedError

    @classmethod
    async def start(cls, update: telegram.Update, **kwargs):
        user = (
            update.callback_query.from_user
            if update.callback_query
            else update.message.from_user
        )

        return await update.callback_query.edit_message_text(
            f"Hi {user.full_name}!",
            reply_markup=cls.get_markup(**kwargs),
        )


def chunks(lst, n):
    """Yield successive n-sized chunks from lst."""
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


def reply(update, text, **kwargs):
    kwargs = {
        "disable_notification": True,
        "disable_web_page_preview": True,
        "parse_mode": ParseMode.HTML,
        **kwargs,
    }
    try:
        update.message.reply_text(
            text[:1000] + ("" if len(text) <= 1000 else "[truncated]"),  # noqa: PLR2004
            **kwargs,
        )
    except telegram.error.BadRequest as e:
        logger.exception(e)
    return ""


def validate_message(message, bot, custom_logger):
    if not message or not (text := message.text):
        custom_logger.warning("No message text")
        return ""

    user = message.from_user
    if user.is_bot:
        custom_logger.warning(
            "Ignoring message from bot(%s): %s",
            user.username,
            getattr(message, "text", "Got no text"),
        )
        return ""

    if not message.chat_id:
        custom_logger.warning("No chat_id in message keys: %s", list(message))
        return ""

    if str(message.chat_id) not in bot.whitelist:
        custom_logger.warning("Chat '%s' not in whitelist", message.chat_id)
        return ""

    text = text.strip()
    if isinstance(text, six.binary_type):
        text = text.decode()

    if len(text) < 1 or not text.startswith("/"):
        custom_logger.info(
            "Not a command: '%s' (%s)", text, user.username or user.full_name
        )
        return ""

    return text[1:]
