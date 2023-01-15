import logging
import operator
from datetime import datetime

from django.views.decorators.csrf import csrf_exempt

import telegram
import yeelight
from telegram import InlineKeyboardMarkup, InlineKeyboardButton

logging.basicConfig(format="%(asctime)s - %(levelname)s:%(name)s - %(message)s")
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def chunks(lst, width):
    """Yield successive n-sized chunks from lst."""
    for i in range(width):
        yield [lst[i + j * width] for j in range(width) if i + j * width < len(lst)]


def get_bulbs():
    bulbs = yeelight.discover_bulbs()
    return sorted(bulbs, key=operator.itemgetter("ip"))


def get_markup():
    def verbose_light(light):
        props = light["capabilities"]
        name = props["name"] or light["ip"]
        status_icon = "💡" if props["power"] == "on" else "🌑"
        return f"{status_icon} {name}"

    items = get_bulbs()
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


class Inlines:
    @classmethod
    def end(cls, update):
        bot = update.callback_query.bot
        message = update.callback_query.message
        try:
            return bot.edit_message_text(
                chat_id=message.chat_id,
                message_id=message.message_id,
                text="See you next time!",
            ).to_json()
        except telegram.error.BadRequest as e:
            return e.message

    @classmethod
    def refresh(cls, update):
        bot = update.callback_query.bot
        message = update.callback_query.message
        try:
            return bot.edit_message_text(
                chat_id=message.chat_id,
                message_id=message.message_id,
                text=f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                reply_markup=get_markup(),
            ).to_json()
        except telegram.error.BadRequest as e:
            return e.message

    @classmethod
    def start(cls, update):
        user = update.message.from_user
        logger.info("User %s started the conversation.", user.full_name)
        return update.message.reply_text(
            f"Hi {update.message.from_user.full_name}!",
            reply_markup=get_markup(),
        ).to_json()

    @classmethod
    def toggle(cls, update, ip):
        bulb = yeelight.Bulb(ip)
        try:
            response = bulb.toggle()
        except yeelight.main.BulbException as e:
            logger.error(str(e))
            return ""

        logger.debug(f"Bulb {ip} was toggled. Response: {response}")
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
        return logging.error(f"Ignoring message from: {who}")

    if not hasattr(message, "text") or not message.text:
        return logging.warning(f"Got no text")

    if not message.text.startswith("/"):
        return logger.warning(f"Not a command: {message.text}")

    command = message.text[1:]
    if command == "start":
        return Inlines.start(update)

    return logger.warning(f"Unhandled command: {message.text}")
