from datetime import datetime

import structlog
import telegram
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update

from mainframe.bots.management.commands.inlines.shared import BaseInlines
from mainframe.clients.lights import LightsClient, LightsException

logger = structlog.get_logger(__name__)


class LightsInline(BaseInlines):
    @classmethod
    def get_markup(cls):
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
    def refresh(cls, update: Update):
        greeting_message = f"Hi {update.callback_query.from_user.full_name}!"

        text = f"Last update: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        try:
            return update.callback_query.edit_message_text(
                text=f"{greeting_message}\n{text}", reply_markup=cls.get_markup()
            )
        except telegram.error.BadRequest as e:
            return e.message

    @classmethod
    def toggle(cls, update, ip):
        try:
            response = LightsClient.toggle(ip)
        except LightsException:
            logger.exception("Error toggling light", ip=ip)
            return ""

        logger.info("Light toggled", ip=ip, response=str(response))
        return cls.refresh(update)
