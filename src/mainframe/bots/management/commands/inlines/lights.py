from datetime import datetime

import pytz
import telegram
from mainframe.bots.management.commands.inlines.shared import BaseInlines
from mainframe.clients.lights import LightsClient, LightsException
from mainframe.clients.logs import get_default_logger
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

logger = get_default_logger(__name__)


class LightsInline(BaseInlines):
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
                        callback_data="lights toggle_home "
                        f"{'away' if status == 'home' else 'home'}",
                    ),
                ]
            ]
            + [
                [
                    InlineKeyboardButton(
                        verbose_light(item), callback_data=f"lights toggle {item['ip']}"
                    )
                ]
                for item in items
            ]
            + [
                [
                    InlineKeyboardButton("✅", callback_data="end"),
                    InlineKeyboardButton("♻", callback_data="lights refresh"),
                ]
            ]
        )

    @classmethod
    def refresh(cls, update, state=None):
        bot = update.callback_query.bot
        message = update.callback_query.message
        greeting_message = f"Hi {update.callback_query.from_user.full_name}!"
        status = state["status"] if state else ""

        text = f"Last update: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        if state:
            text = (
                f"State: {'🏠' if status == 'home' else '✈️'}"
                f"{status.title()}\nSince: {state['last_updated']}\n{text}"
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

        logger.info("Bulb %s was toggled. Response: %s", ip, response)
        return cls.refresh(update)

    @classmethod
    def toggle_home(cls, update, bot, value):
        last_updated = datetime.now().astimezone(pytz.utc).strftime("%Y-%m-%d %H:%M:%S")
        state = {"status": value, "last_updated": last_updated}
        bot.additional_data["state"] = state
        bot.save()

        logger.info("Switched state to '%s'", value)
        return cls.refresh(update, state=state)
