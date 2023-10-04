import logging
import math

from telegram import InlineKeyboardMarkup, InlineKeyboardButton

from api.bots.webhooks.shared import BaseInlines, chunks
from clients.logs import MainframeHandler
from clients.meals import MealsClient
from clients.chat import edit_message
from meals.models import Meal

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


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


class MealsInline(BaseInlines):
    PER_PAGE = 24

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
        logger.info("Got %d meals", len(items))

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
        buttons = [
            [
                InlineKeyboardButton("✅", callback_data="end"),
                InlineKeyboardButton("♻️", callback_data="meal sync"),
            ]
        ]

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
        message = update.callback_query.message

        return edit_message(
            update.callback_query.bot,
            message.chat_id,
            message.message_id,
            text=day,
            reply_markup=cls.get_meals_markup(day=day, page=page),
        )

    @classmethod
    def fetch(cls, update, _id, page):
        message = update.callback_query.message
        try:
            item = Meal.objects.get(pk=_id)
        except Meal.DoesNotExist:
            item = None

        return edit_message(
            bot=update.callback_query.bot,
            chat_id=message.chat_id,
            message_id=message.message_id,
            text=parse_meal(item) if item else "Not found",
            reply_markup=cls.get_meals_markup(
                day=item.date.strftime("%Y-%m-%d"), page=page, bottom_level=True
            ),
        )

    @classmethod
    def start(cls, update, page=None, override_message=None):
        count = Meal.objects.distinct("date").count()
        logger.info("Counted %s dates", count)
        last_page = math.ceil(count / cls.PER_PAGE)
        welcome_message = "Welcome {name}\nChoose a date [{page} / {total}]"

        if not update.callback_query:
            user = update.message.from_user
            logger.info("User %s started the conversation.", user.full_name)

            return update.message.reply_text(
                welcome_message.format(
                    name=user.full_name, page=1, total=last_page, count=count
                )
                if not override_message
                else override_message,
                reply_markup=cls.get_markup(is_top_level=True, last_page=last_page),
            ).to_json()

        message = update.callback_query.message
        user = update.callback_query.from_user
        return edit_message(
            bot=update.callback_query.bot,
            chat_id=message.chat_id,
            message_id=message.message_id,
            text=welcome_message.format(
                name=user.full_name, page=page or 1, total=last_page, count=count
            )
            if not override_message
            else override_message,
            reply_markup=cls.get_markup(
                page=int(page) if page else 1,
                is_top_level=True,
                last_page=last_page,
            ),
        )

    @classmethod
    def sync(cls, update):
        meals = MealsClient.fetch_meals()
        override_message = f"Fetched {len(meals)} meals 👌"
        return cls.start(update, override_message=override_message)
