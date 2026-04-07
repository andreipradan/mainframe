import asyncio
import sys
import time

import dotenv
import structlog
import telegram
from telegram.constants import ParseMode

logger = structlog.get_logger(__name__)


async def edit_message(bot, chat_id, message_id, text, reply_markup=None):
    try:
        return await bot.edit_message_text(
            chat_id=chat_id,
            message_id=message_id,
            text=text or "Not found",
            reply_markup=reply_markup,
            disable_web_page_preview=True,
            parse_mode=ParseMode.HTML,
        )
    except telegram.error.BadRequest as e:
        logger.exception(
            "Error editing message",
            chat_id=chat_id,
            message_id=message_id,
            text=text,
        )
        return e.message


def send_telegram_message(text, retries_on_network_error=3, **kwargs):
    msg_logger = kwargs.pop("logger", logger)
    config = dotenv.dotenv_values()
    if not (chat_id := config.get("TELEGRAM_CHAT_ID")):
        msg_logger.error("TELEGRAM_CHAT_ID not set on env")
        return None
    if not (token := config.get("TELEGRAM_TOKEN")):
        msg_logger.error("TELEGRAM_TOKEN not set on env")
        return None

    bot_kwargs = {
        "chat_id": chat_id,
        "disable_notification": True,
        "disable_web_page_preview": True,
        "parse_mode": ParseMode.MARKDOWN,
    }
    bot_kwargs.update(kwargs)
    bot = telegram.Bot(token)
    try:
        return bot.send_message(text=text, **bot_kwargs)
    except telegram.error.NetworkError as e:
        if not isinstance(e, telegram.error.BadRequest):
            if "[Errno -3] Temporary failure in name resolution" not in str(e):
                raise e
            time.sleep(5)
            return send_telegram_message(
                text,
                retries_on_network_error=retries_on_network_error - 1,
                **bot_kwargs,
            )

        if "can't find end of the entity" in str(e):
            location = int(e.message.split()[-1])
            msg_logger.warning(
                "Error parsing markdown - skipping character",
                char=text[location],
                chat_id=chat_id,
                location=location,
                text=text,
            )
            text = f"{text[:location]}{text[location + 1 :]}"
            return send_telegram_message(text, chat_id=chat_id, logger=msg_logger)
        msg_logger.warning(
            "Error sending message. Trying unformatted",
            chat_id=chat_id,
            error=str(e),
            text=text,
        )
        try:
            return bot.send_message(text=text, **{**bot_kwargs, "parse_mode": None})
        except telegram.error.BadRequest as err:
            msg_logger.exception(
                "Error sending unformatted message",
                chat_id=chat_id,
                error=str(err),
                text=text,
            )


if __name__ == "__main__":
    if len(sys.argv) == 1:
        raise ValueError("Text missing")
    asyncio.run(send_telegram_message(text=" ".join(sys.argv[1:])))
