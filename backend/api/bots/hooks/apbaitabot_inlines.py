import logging
import operator
from datetime import datetime

import telegram
import yeelight
from telegram import InlineKeyboardMarkup, InlineKeyboardButton

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


def end(update):
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


def refresh(update):
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


def start(update):
    user = update.message.from_user
    logger.info("User %s started the conversation.", user.full_name)
    return update.message.reply_text(
        f"Hi {update.message.from_user.full_name}!",
        reply_markup=get_markup(),
    ).to_json()


def toggle(update, ip):
    bulb = yeelight.Bulb(ip)
    try:
        response = bulb.toggle()
    except yeelight.main.BulbException as e:
        logger.error(str(e))
        return ""

    logger.debug(f"Bulb {ip} was toggled. Response: {response}")
    return refresh(update)
