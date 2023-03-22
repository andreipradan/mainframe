import logging
import math

import telegram
from telegram import InlineKeyboardMarkup, InlineKeyboardButton

from api.bots.webhooks.shared import BaseInlines
from bots.clients import mongo as database

logger = logging.getLogger(__name__)


class SavedMessagesInlines(BaseInlines):
    PER_PAGE = 10

    def __init__(self, chat_id):
        self.chat_id = int(chat_id)

    def get_markup(self, page=1, is_top_level=False, last_page=None):
        buttons = [[InlineKeyboardButton("✅", callback_data="end")]]

        if not is_top_level:
            buttons[0].insert(
                0,
                InlineKeyboardButton("👆", callback_data=f"start {self.chat_id} {page}"),
            )
            return InlineKeyboardMarkup(buttons)

        if last_page != 1:
            buttons[0].insert(
                0,
                InlineKeyboardButton(
                    "👈",
                    callback_data=f"start {self.chat_id} {page - 1 if page > 1 else last_page}",
                ),
            )
            buttons[0].append(
                InlineKeyboardButton(
                    "👉",
                    callback_data=f"start {self.chat_id} {page + 1 if page != last_page else 1}",
                )
            )

        items = list(
            database.get_many(
                collection="saved-messages",
                order_by="date",
                how=-1,
                chat_id=self.chat_id,
                skip=(page - 1) * self.PER_PAGE if page - 1 >= 0 else 0,
                limit=self.PER_PAGE,
            )
        )

        logger.info(f"Got {len(items)} saved messages")

        return InlineKeyboardMarkup(
            [
                [
                    InlineKeyboardButton(
                        f"{item['chat_name']} by {item['author']['full_name']}",
                        callback_data=f"fetch {self.chat_id} {item['_id']} {page}",
                    )
                ]
                for item in items
            ]
            + buttons
        )

    def fetch(self, update, _id, page):
        bot = update.callback_query.bot
        message = update.callback_query.message
        item = database.get_stats("saved-messages", silent=True, _id=_id)
        try:
            return bot.edit_message_text(
                chat_id=message.chat_id,
                message_id=message.message_id,
                text=link(item) if item else "Not found",
                reply_markup=self.get_markup(page=page),
                disable_web_page_preview=True,
                parse_mode=telegram.ParseMode.HTML,
            ).to_json()
        except telegram.error.BadRequest as e:
            return e.message

    def start(self, update, page=None):
        count = database.get_collection("saved-messages").count_documents(
            {"chat_id": self.chat_id}
        )
        logger.info(f"Counted {count} documents")
        last_page = math.ceil(count / self.PER_PAGE)
        welcome_message = "Welcome {name}\nChoose a message [{page} / {total}]"

        if not update.callback_query:
            user = update.message.from_user
            logger.info("User %s started the conversation.", user.full_name)

            return update.message.reply_text(
                welcome_message.format(
                    name=user.full_name, page=1, total=last_page, count=count
                ),
                reply_markup=self.get_markup(is_top_level=True, last_page=last_page),
            ).to_json()

        bot = update.callback_query.bot
        message = update.callback_query.message
        user = update.callback_query.from_user
        try:
            return bot.edit_message_text(
                chat_id=message.chat_id,
                message_id=message.message_id,
                text=welcome_message.format(
                    name=user.full_name, page=page, total=last_page, count=count
                ),
                reply_markup=self.get_markup(
                    page=int(page),
                    is_top_level=True,
                    last_page=last_page,
                ),
            ).to_json()
        except telegram.error.BadRequest as e:
            logger.error(e.message)
            return e.message


def link(item):
    author = item["author"]["full_name"]
    chat_id = str(item["chat_id"])[3:]
    date = item["date"].strftime("%d %b %Y %H:%M")
    message_id = item["message"]["id"]
    text = item["message"]["text"]
    return f"""
<b>{item['chat_name']}</b>
- by {author}, {date}

{text or "-"}

Link: https://t.me/c/{chat_id}/{message_id}"""
