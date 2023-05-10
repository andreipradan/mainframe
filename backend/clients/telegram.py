import logging
from pathlib import Path

import environ
import telegram

# from core.settings import get_file_handler

logger = logging.getLogger(__name__)
# logger.addHandler(get_file_handler(Path(__file__).stem))


def edit_message(bot, chat_id, message_id, text, reply_markup=None, parse_mode="HTML"):
    try:
        return bot.edit_message_text(
            chat_id=chat_id,
            message_id=message_id,
            text=text or "Not found",
            reply_markup=reply_markup,
            disable_web_page_preview=True,
            parse_mode=getattr(telegram.ParseMode, parse_mode, "HTML"),
        ).to_json()
    except telegram.error.BadRequest as e:
        logger.error(e)
        return e.message


def send_telegram_message(text, **kwargs):
    config = environ.Env()
    bot_kwargs = {
        "chat_id": kwargs.get("chat_id", config("TELEGRAM_DEBUG_CHAT_ID")),
        "disable_notification": True,
        "disable_web_page_preview": True,
        "parse_mode": telegram.ParseMode.MARKDOWN,
    }
    bot_kwargs.update(kwargs)
    bot = telegram.Bot(config("TELEGRAM_DEBUG_TOKEN"))
    return bot.send_message(text=text, **bot_kwargs)
