import logging

import telegram


def edit_message(bot, chat_id, message_id, text, reply_markup=None, parse_mode="HTML", logger=None):
    logger = logger or logging.getLogger(__name__)
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
