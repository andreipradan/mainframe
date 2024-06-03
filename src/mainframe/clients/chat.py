import logging
import sys

import dotenv
import telegram


def edit_message(bot, chat_id, message_id, text, reply_markup=None):
    try:
        return bot.edit_message_text(
            chat_id=chat_id,
            message_id=message_id,
            text=text or "Not found",
            reply_markup=reply_markup,
            disable_web_page_preview=True,
            parse_mode=telegram.ParseMode.HTML,
        ).to_json()
    except telegram.error.BadRequest as e:
        logging.error(e)
        return e.message


def send_telegram_message(text, **kwargs):
    logger = kwargs.pop("logger", logging)
    config = dotenv.dotenv_values()
    if not (chat_id := config.get("TELEGRAM_DEBUG_CHAT_ID")):
        logger.error("TELEGRAM_DEBUG_CHAT_ID not set on env")
        return
    if not (token := config.get("TELEGRAM_DEBUG_TOKEN")):
        logger.error("TELEGRAM_DEBUG_TOKEN not set on env")
        return

    bot_kwargs = {
        "chat_id": chat_id,
        "disable_notification": True,
        "disable_web_page_preview": True,
        "parse_mode": telegram.ParseMode.MARKDOWN,
    }
    bot_kwargs.update(kwargs)
    bot = telegram.Bot(token)
    try:
        return bot.send_message(text=text, **bot_kwargs)
    except telegram.error.TelegramError as e:
        logger.error(str(e))


def send_photo(photo, **kwargs):
    logger = kwargs.pop("logger", logging)
    logger.info("[Telegram] Sending photo")
    config = dotenv.dotenv_values()
    bot = telegram.Bot(config["TELEGRAM_DEBUG_TOKEN"])
    try:
        return bot.send_photo(
            chat_id=config["TELEGRAM_DEBUG_CHAT_ID"],
            photo=photo,
            **kwargs,
        )
    except telegram.error.TelegramError as e:
        logger.error(str(e))
    logger.info("[Telegram] Done")


if __name__ == "__main__":
    if len(sys.argv) == 1:
        raise ValueError("Text missing")
    send_telegram_message(text=" ".join(sys.argv[1:]))
