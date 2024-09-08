import six
import telegram
from mainframe.clients.logs import get_default_logger

logger = get_default_logger(__name__)


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
    def start(cls, update: telegram.Update):
        user = (
            update.callback_query.from_user
            if update.callback_query
            else update.message.from_user
        )

        if not update.callback_query:
            logger.info("User %s started the conversation.", user.full_name)
            return update.message.edit_text(
                f"Welcome {user.full_name}\nChoose your favorite line",
                reply_markup=cls.get_markup(),
            ).to_json()

        return update.callback_query.edit_message_text(
            f"Hi {user.full_name}!",
            reply_markup=cls.get_markup(),
        )


def chunks(lst, n):
    """Yield successive n-sized chunks from lst."""
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


def reply(update, text, **kwargs):
    kwargs = {
        "disable_notification": True,
        "disable_web_page_preview": True,
        "parse_mode": telegram.ParseMode.HTML,
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
