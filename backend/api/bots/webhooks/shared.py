import logging

import six
import telegram

from clients.logs import MainframeHandler

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


class BaseInlines:
    @classmethod
    def end(cls, update):
        bot = update.callback_query.bot
        message = update.callback_query.message
        try:
            return bot.edit_message_text(
                chat_id=message.chat_id,
                message_id=message.message_id,
                text="See you next time!",
            ).to_json()
        except telegram.error.BadRequest as e:
            return e.message

    @classmethod
    def get_markup(cls, **kwargs):
        raise NotImplementedError

    @classmethod
    def start(cls, update):
        user = update.message.from_user
        logger.info("User %s started the conversation.", user.full_name)
        return update.message.reply_text(
            f"Hi {update.message.from_user.full_name}!",
            reply_markup=cls.get_markup(),
        ).to_json()


def chunks(lst, n):
    """Yield successive n-sized chunks from lst."""
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


def reply(update, text):
    try:
        update.message.reply_text(
            text[:1000] + ("" if len(text) <= 1000 else "[truncated]"),
            disable_notification=True,
            disable_web_page_preview=True,
            parse_mode=telegram.ParseMode.HTML,
        )
    except telegram.error.BadRequest as e:
        logger.exception(e)
    return ""


def validate_message(message, bot, custom_logger):
    if not message:
        custom_logger.warning("No message")
        return ""

    text = message.text
    if not text:
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
        text = text.decode("utf-8")

    if len(text) < 1 or not text.startswith("/"):
        custom_logger.info("Not a command: '%s' (%s)", text, user.username or user.full_name)
        return ""

    return text[1:]
