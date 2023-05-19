import logging
import sys

import dotenv
import telegram


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
        logging.error(e)
        return e.message


def send_telegram_message(**kwargs):
    if not any(("text" in kwargs, "photo" in kwargs)):
        return logging.exception("Missing text or photo")

    config = dotenv.dotenv_values()
    bot_kwargs = {
        "chat_id": config["TELEGRAM_DEBUG_CHAT_ID"],
        "disable_notification": True,
        "disable_web_page_preview": True,
        "parse_mode": telegram.ParseMode.MARKDOWN,
    }
    bot_kwargs.update(kwargs)
    bot = telegram.Bot(config["TELEGRAM_DEBUG_TOKEN"])
    if "text" in bot_kwargs:
        action = bot.send_message
    elif "photo" in bot_kwargs:
        action = bot.send_photo
    else:
        raise NotImplementedError
    try:
        return action(**bot_kwargs)
    except telegram.error.TelegramError as e:
        logging.error(str(e))


if __name__ == "__main__":
    if len(sys.argv) == 1:
        raise ValueError("Text missing")
    send_telegram_message(text=" ".join(sys.argv[1:]))
