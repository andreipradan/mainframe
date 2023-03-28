import logging
import math

import telegram
from telegram import InlineKeyboardMarkup, InlineKeyboardButton

from api.bots.webhooks.shared import BaseInlines, chunks
from bots.clients import mongo as database
from meals.models import Meal

logger = logging.getLogger(__name__)


class MealsInline(BaseInlines):
    PER_PAGE = 24

    def __init__(self, filters: list):
        meal_filters = {}
        while filters:
            if len(filters) < 2:
                break
            meal_filters[filters.pop()] = filters.pop()
        self.filters = meal_filters

    @classmethod
    def get_meals_markup(cls, day, page, bottom_level=False):
        buttons = [[InlineKeyboardButton("✅", callback_data="end")]]
        if bottom_level:
            buttons[0].insert(
                0,
                InlineKeyboardButton("👆", callback_data=f"meal fetch_day {day} {page}"),
            )
            return InlineKeyboardMarkup(buttons)

        buttons[0].insert(
            0, InlineKeyboardButton("👆", callback_data=f"meal start {page}")
        )
        items = Meal.objects.filter(date=day).order_by("type")
        logger.info(f"Got {len(items)} meals")

        return InlineKeyboardMarkup(
            [
                [
                    InlineKeyboardButton(
                        f"{item.get_type_display()}",
                        callback_data=f"meal fetch {item.pk} {page}",
                    )
                ]
                for item in items
            ]
            + buttons
        )

    @classmethod
    def get_markup(cls, page=1, is_top_level=False, last_page=None):
        buttons = [[InlineKeyboardButton("✅", callback_data="end")]]

        if not is_top_level:
            buttons[0].insert(
                0,
                InlineKeyboardButton("👆", callback_data=f"meal start {page}"),
            )
            return InlineKeyboardMarkup(buttons)

        if last_page != 1:
            buttons[0].insert(
                0,
                InlineKeyboardButton(
                    "👈",
                    callback_data=f"meal start {page - 1 if page > 1 else last_page}",
                ),
            )
            buttons[0].append(
                InlineKeyboardButton(
                    "👉",
                    callback_data=f"meal start {page + 1 if page != last_page else 1}",
                )
            )

        start = (page - 1) * cls.PER_PAGE if page - 1 >= 0 else 0
        items = list(
            Meal.objects.distinct("date").order_by("date", "type")[
                start : start + cls.PER_PAGE
            ]
        )
        return InlineKeyboardMarkup(
            [
                [
                    InlineKeyboardButton(
                        f"{item.date.strftime('%d %b %y')}",
                        callback_data=f"meal fetch_day {item.date.strftime('%Y-%m-%d')} {page}",
                    )
                    for item in chunk
                ]
                for chunk in chunks(items, 3)
            ]
            + buttons
        )

    @classmethod
    def fetch_day(cls, update, day, page):
        bot = update.callback_query.bot
        message = update.callback_query.message

        try:
            return bot.edit_message_text(
                chat_id=message.chat_id,
                message_id=message.message_id,
                text=day,
                reply_markup=cls.get_meals_markup(day=day, page=page),
                disable_web_page_preview=True,
                parse_mode=telegram.ParseMode.HTML,
            ).to_json()
        except telegram.error.BadRequest as e:
            logger.error(e)
            return e.message

    @classmethod
    def fetch(cls, update, _id, page):
        bot = update.callback_query.bot
        message = update.callback_query.message
        try:
            item = Meal.objects.get(pk=_id)
        except Meal.DoesNotExist:
            item = None

        try:
            return bot.edit_message_text(
                chat_id=message.chat_id,
                message_id=message.message_id,
                text=parse_meal(item) if item else "Not found",
                reply_markup=cls.get_meals_markup(
                    day=item.date.strftime("%Y-%m-%d"), page=page, bottom_level=True
                ),
                disable_web_page_preview=True,
                parse_mode=telegram.ParseMode.HTML,
            ).to_json()
        except telegram.error.BadRequest as e:
            logger.error(e)
            return e.message

    @classmethod
    def start(cls, update, page=None):
        count = Meal.objects.distinct("date").count()
        logger.info(f"Counted {count} dates")
        last_page = math.ceil(count / cls.PER_PAGE)
        welcome_message = "Welcome {name}\nChoose a date [{page} / {total}]"

        if not update.callback_query:
            user = update.message.from_user
            logger.info("User %s started the conversation.", user.full_name)

            return update.message.reply_text(
                welcome_message.format(
                    name=user.full_name, page=1, total=last_page, count=count
                ),
                reply_markup=cls.get_markup(is_top_level=True, last_page=last_page),
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
                reply_markup=cls.get_markup(
                    page=int(page),
                    is_top_level=True,
                    last_page=last_page,
                ),
            ).to_json()
        except telegram.error.BadRequest as e:
            logger.error(e.message)
            return e.message


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


def parse_meal(item: Meal):
    ingredients = "\n".join(
        [f"{i + 1}. {ingredient}" for i, ingredient in enumerate(item.ingredients)]
    )
    quantities = "\n".join([f"{k} - {v}" for k, v in item.quantities.items()])
    return f"""
<b>{item.name}</b>
{item.date.isoformat()}, {item.get_type_display()}

{item.name or "-"}

Ingredients:
{ingredients}

Quantity:
{quantities}
"""
