import logging
import math

from pymongo.errors import ConfigurationError
from telegram import InlineKeyboardButton as Button
from telegram import InlineKeyboardMarkup as Keyboard

from api.bots.webhooks.shared import BaseInlines
from bots.models import Message
from clients.chat import edit_message
from clients.logs import MainframeHandler

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


class SavedMessagesInlines(BaseInlines):
    PER_PAGE = 10

    def __init__(self, chat_id):
        self.chat_id = int(chat_id)

    def get_markup(self, page=1, is_top_level=False, last_page=None):
        buttons = [[Button("✅", callback_data="end")]]

        if not is_top_level:
            buttons[0].insert(
                0,
                Button("👆", callback_data=f"start {self.chat_id} {page}"),
            )
            return Keyboard(buttons)

        if last_page > 1:
            buttons[0].insert(
                0,
                Button(
                    "👈",
                    callback_data=f"start {self.chat_id} {page - 1 if page > 1 else last_page}",
                ),
            )
            buttons[0].append(
                Button(
                    "👉",
                    callback_data=f"start {self.chat_id} {page + 1 if page != last_page else 1}",
                )
            )

        start = (page - 1) * self.PER_PAGE if page - 1 >= 0 else 0
        items = list(
            Message.objects.filter(chat_id=self.chat_id)[start : start + self.PER_PAGE]
        )

        return Keyboard(
            [
                [
                    Button(
                        f"{item.chat_title} by {item.author['full_name']}",
                        callback_data=f"fetch {self.chat_id} {item.id} {page}",
                    )
                ]
                for item in items
            ]
            + buttons
        )

    def fetch(self, update, _id, page):
        message = update.callback_query.message
        item = Message.objects.get(id=_id)
        return edit_message(
            bot=update.callback_query.bot,
            chat_id=message.chat_id,
            message_id=message.message_id,
            text=link(item) if item else "Not found",
            reply_markup=self.get_markup(page=page),
        )

    def start(self, update, page=None):
        try:
            count = Message.objects.filter(chat_id=self.chat_id).count()
        except ConfigurationError as e:
            return update.message.reply_text(f"Got an error: {str(e)}")

        last_page = math.ceil(count / self.PER_PAGE)
        welcome_message = "Welcome {name}"
        if count:
            welcome_message += f"\nChoose a message\nTotal: {count}"
        else:
            welcome_message += "\nThere are no messages in this chat"

        if last_page > 1:
            welcome_message += f"\nPage: {page or 1}/{last_page}"

        if not update.callback_query:
            user = update.message.from_user
            logger.info("User %s started the conversation.", user.full_name)
            return update.message.reply_text(
                welcome_message.format(name=user.full_name),
                reply_markup=self.get_markup(is_top_level=True, last_page=last_page),
            ).to_json()

        message = update.callback_query.message
        full_name = update.callback_query.from_user.full_name
        return edit_message(
            bot=update.callback_query.bot,
            chat_id=message.chat_id,
            message_id=message.message_id,
            text=welcome_message.format(name=full_name),
            reply_markup=self.get_markup(
                page=int(page),
                is_top_level=True,
                last_page=last_page,
            ),
        )


def link(item):
    return f"""
<b>{item.chat_title}</b>
- by {item.author["full_name"]}, {item.date.strftime("%d %b %Y %H:%M")}

{item.text or "-"}

Link: https://t.me/c/{str(item.chat_id)[3:]}/{item.message_id}"""
