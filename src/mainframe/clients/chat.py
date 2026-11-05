import asyncio
import sys

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
            text_length=len(text or ""),
        )
        return e.message


async def _send_telegram_message(
    bot,
    text,
    msg_logger,
    bot_kwargs,
    retries_on_network_error,
):
    try:
        return await bot.send_message(text=text, **bot_kwargs)
    except telegram.error.NetworkError as e:
        if isinstance(e, telegram.error.BadRequest):
            if bot_kwargs.get("parse_mode") is None:
                msg_logger.exception(
                    "Error sending unformatted message",
                    chat_id=bot_kwargs["chat_id"],
                    error=str(e),
                    text=text,
                )
                return None

            if "can't find end of the entity" in str(e):
                location = int(e.message.split()[-1])
                msg_logger.warning(
                    "Error parsing markdown - skipping character",
                    char=text[location],
                    chat_id=bot_kwargs["chat_id"],
                    location=location,
                    text=text,
                )
                text = f"{text[:location]}{text[location + 1 :]}"
                return await _send_telegram_message(
                    bot,
                    text,
                    msg_logger,
                    bot_kwargs,
                    retries_on_network_error,
                )

            msg_logger.warning(
                "Error sending message. Trying unformatted",
                chat_id=bot_kwargs["chat_id"],
                error=str(e),
                text=text,
            )
            return await _send_telegram_message(
                bot,
                text,
                msg_logger,
                {**bot_kwargs, "parse_mode": None},
                retries_on_network_error,
            )

        if "[Errno -3] Temporary failure in name resolution" not in str(e):
            raise
        if retries_on_network_error <= 0:
            raise

        await asyncio.sleep(5)
        return await _send_telegram_message(
            bot,
            text,
            msg_logger,
            bot_kwargs,
            retries_on_network_error - 1,
        )


def send_telegram_message(text, retries_on_network_error=3, **kwargs):
    msg_logger = kwargs.pop("logger", logger)
    config = dotenv.dotenv_values()
    chat_id = config.get("TELEGRAM_CHAT_ID")
    token = config.get("TELEGRAM_TOKEN")
    if not chat_id or not token:
        msg_logger.error(
            "TELEGRAM_CHAT_ID not set on env"
            if not chat_id
            else "TELEGRAM_TOKEN not set on env"
        )
        return None

    bot_kwargs = {
        "chat_id": chat_id,
        "disable_notification": True,
        "disable_web_page_preview": True,
        "parse_mode": ParseMode.MARKDOWN,
    }
    bot_kwargs.update(kwargs)

    async def send():
        async with telegram.Bot(token) as bot:
            return await _send_telegram_message(
                bot,
                text,
                msg_logger,
                bot_kwargs,
                retries_on_network_error,
            )

    return asyncio.run(send())


if __name__ == "__main__":
    if len(sys.argv) == 1:
        raise ValueError("Text missing")
    send_telegram_message(text=" ".join(sys.argv[1:]))
