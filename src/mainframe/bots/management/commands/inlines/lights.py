from datetime import datetime

import structlog
import telegram
from asgiref.sync import sync_to_async
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
    async def refresh(cls, update: Update):
        greeting_message = f"Hi {update.callback_query.from_user.full_name}!"

        text = f"Last update: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        try:
            reply_markup = await sync_to_async(cls.get_markup)()
            return await update.callback_query.edit_message_text(
                text=f"{greeting_message}\n{text}", reply_markup=reply_markup
            )
        except telegram.error.BadRequest as e:
            logger.info("Unable to refresh lights message", error=e.message)
            return None

    @classmethod
    async def toggle(cls, update, ip):
        try:
            response = await sync_to_async(LightsClient.toggle)(ip)
        except LightsException as error:
            logger.warning("Error toggling light", ip=ip, error=str(error))
            return None

        logger.info("Light toggled", ip=ip, response=str(response))
        return await cls.refresh(update)
