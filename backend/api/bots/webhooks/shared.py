import logging
import six
import telegram

logger = logging.getLogger(__name__)


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
    def get_markup(cls, items=None):
        raise NotImplementedError

    @classmethod
    def start(cls, update, items=None):
        user = update.message.from_user
        logger.info("User %s started the conversation.", user.full_name)
        return update.message.reply_text(
            f"Hi {update.message.from_user.full_name}!",
            reply_markup=cls.get_markup(items=items),
        ).to_json()


def chunks(lst, width):
    """Yield successive n-sized chunks from lst."""
    for i in range(width):
        yield [lst[i + j * width] for j in range(width) if i + j * width < len(lst)]


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


def validate_message(message, bot, logger):
    if not message:
        logger.warning(f"No message")
        return ""

    text = message.text
    if not text:
        logger.warning("No message text")
        return ""

    user = message.from_user
    if user.is_bot:
        logger.warning(
            f"Ignoring message from bot({user.username}): "
            f"{getattr(message, 'text', 'Got no text')}"
        )
        return ""

    if not message.chat_id:
        logger.warning(f"No chat_id in message keys: {list(message)}")
        return ""

    if str(message.chat_id) not in bot.whitelist:
        logger.warning(f"Chat '{message.chat_id}' not in whitelist")
        return ""

    text = text.strip()
    if isinstance(text, six.binary_type):
        text = text.decode("utf-8")

    if len(text) < 1 or not text.startswith("/"):
        logger.info(f"Not a command: '{text}' ({user.username or user.full_name})")
        return ""

    return text[1:]
