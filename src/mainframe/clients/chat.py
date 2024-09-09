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
    if not (chat_id := config.get("TELEGRAM_CHAT_ID")):
        logger.error("TELEGRAM_CHAT_ID not set on env")
        return None
    if not (token := config.get("TELEGRAM_TOKEN")):
        logger.error("TELEGRAM_TOKEN not set on env")
        return None

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
    except telegram.error.BadRequest as e:
        if "can't find end of the entity" in str(e):
            location = int(e.message.split()[-1])
            logger.warning(
                "Error parsing markdown - removing char at position: %s",
                location,
            )
            text = f"{text[location:]}{text[location+1:]}"
            return send_telegram_message(text, chat_id=chat_id, logger=logger)
        logger.exception("Error sending message. Original: %s", e)
    return None


if __name__ == "__main__":
    if len(sys.argv) == 1:
        raise ValueError("Text missing")
    send_telegram_message(text=" ".join(sys.argv[1:]))
