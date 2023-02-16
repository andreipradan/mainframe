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
    def get_markup(cls, status=None):
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
                        "✈️ Set as Away" if status == "home" else "🏠Set as Home",
                        callback_data=f"toggle-home {'away' if status == 'home' else 'home'}",
                    ),
                ]
            ]
            + [
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
    def refresh(cls, update, state=None):
        bot = update.callback_query.bot
        message = update.callback_query.message
        greeting_message = f"Hi {update.message.from_user.full_name}!"
        status = state["status"] if state else ""

        text = (
            f"State: {'🏠' if status == 'home' else '✈️'}{status.title()}\nLast updated: {state['last_updated']}"
            if state
            else f"Last update: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )
        try:
            return bot.edit_message_text(
                chat_id=message.chat_id,
                message_id=message.message_id,
                text=f"{greeting_message}\n{text}",
                reply_markup=cls.get_markup(status=status),
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

    @classmethod
    def toggle_home(cls, update, bot, value):
        last_updated = datetime.now().astimezone(pytz.utc).strftime("%Y-%m-%d %H:%M:%S")
        state = {"status": value, "last_updated": last_updated}
        bot.additional_data["state"] = state
        bot.save()

        logger.info(f"Switched state to '{value}'")
        return cls.refresh(update, state=state)


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
            cmd, state = data.split(" ")
            if cmd == "toggle-home":
                return Inlines.toggle_home(update, bot, state)
            if cmd == "toggle":
                bot.additional_data.get()
                return Inlines.toggle(update, state)

        if data == "refresh":
            return Inlines.refresh(update, bot.additional_data.get("state"))

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
        user = update.message.from_user
        greeting_message = f"Hi {user.full_name}!"
        logger.info(greeting_message)

        state = bot.additional_data.get("state")
        if not state:
            return update.message.reply_text(
                f"{greeting_message}\nState: Not set",
                reply_markup=Inlines.get_markup(),
            ).to_json()

        if not (status := state.get("status")) or not (
            last_updated := state.get("last_updated")
        ):
            return update.message.reply_text(
                f"{greeting_message}\nState: invalid",
                reply_markup=Inlines.get_markup(),
            ).to_json()

        return update.message.reply_text(
            f"{greeting_message}\nState: {status.title()}\nLast updated: {last_updated}",
            reply_markup=Inlines.get_markup(status),
        ).to_json()

    return logger.warning(f"Unhandled command: {message.text}")
