import logging
from datetime import datetime

import pytz
import telegram
from telegram import InlineKeyboardMarkup, InlineKeyboardButton

from api.bots.webhooks.shared import BaseInlines, chunks, reply
from api.lights.client import LightsClient, LightsException

logger = logging.getLogger(__name__)


class Inlines(BaseInlines):
    @classmethod
    def get_markup(cls, items=None):
        def verbose_light(light):
            props = light["capabilities"]
            name = props["name"] or light["ip"]
            status_icon = "💡" if props["power"] == "on" else "🌑"
            return f"{status_icon} {name}"

        items = LightsClient.get_bulbs()
        return InlineKeyboardMarkup(
            [
                [
                    InlineKeyboardButton(
                        verbose_light(item), callback_data=f"toggle {item['ip']}"
                    )
                    for item in chunk
                ]
                for chunk in chunks(list(items), 5)
            ]
            + [
                [
                    InlineKeyboardButton("✅", callback_data="end"),
                    InlineKeyboardButton("♻", callback_data="refresh"),
                ]
            ]
        )

    @classmethod
    def refresh(cls, update):
        bot = update.callback_query.bot
        message = update.callback_query.message
        try:
            return bot.edit_message_text(
                chat_id=message.chat_id,
                message_id=message.message_id,
                text=f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                reply_markup=cls.get_markup(),
            ).to_json()
        except telegram.error.BadRequest as e:
            return e.message

    @classmethod
    def toggle(cls, update, ip):
        try:
            response = LightsClient.toggle(ip)
        except LightsException as e:
            logger.error(str(e))
            return ""

        logger.info(f"Bulb {ip} was toggled. Response: {response}")
        return cls.refresh(update)


def call(data, bot):
    update = telegram.Update.de_json(data, telegram.Bot(bot.token))
    message = update.message

    if update.callback_query:
        data = update.callback_query.data
        if data.startswith("toggle"):
            toggle_components = data.split(" ")
            if not len(toggle_components) == 2:
                return logger.error(
                    f"Invalid parameters for toggle: {toggle_components}"
                )
            return Inlines.toggle(update, data.split(" ")[1])
        method = getattr(Inlines, data, None)
        if not method:
            return logger.error(f"Unhandled callback: {data}")
        return getattr(Inlines, data)(update)

    if not message:
        return logger.warning("No message")

    if message.from_user.username not in bot.whitelist:
        who = message.from_user.username or message.from_user.id
        return logger.error(f"Ignoring message from: {who}")

    if not hasattr(message, "text") or not message.text:
        return logger.warning(f"Got no text")

    if not message.text.startswith("/"):
        return logger.warning(f"Not a command: {message.text}")

    command = message.text[1:]
    if command == "start":
        return Inlines.start(update)

    if command in ["home", "away"]:
        bot.additional_data["state"] = {
            "status": command,
            "last_updated": datetime.now().astimezone(tz=pytz.utc),
        }
        return reply(update, f"Updated state to '{command}'")

    if command == "get_state":
        state = bot.additional_data.get("state")
        if not state:
            return reply(update, "State not set")
        if not (status := state.get("")) or not (
            last_updated := state.get("last_updated")
        ):
            return reply(update, "Couldn't get state")

        return reply(update, f"State: {status} [Last updated: {last_updated}]")

    return logger.warning(f"Unhandled command: {message.text}")
