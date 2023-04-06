import logging
import math
from operator import itemgetter

import pytz
import requests
from telegram import InlineKeyboardButton as Button, InlineKeyboardMarkup as Keyboard

from api.bots.webhooks.shared import BaseInlines, chunks
from bots.models import Bot
from clients import scraper
from datetime import datetime, timedelta

from clients.telegram import edit_message

logger = logging.getLogger(__name__)


def fetch_line(bus_number, full_details=False):
    now = datetime.now(pytz.timezone("Europe/Bucharest"))
    weekday = now.weekday()
    if weekday in range(5):
        day = "lv"
    elif weekday == 5:
        day = "s"
    elif weekday == 6:
        day = "d"
    else:
        logger.error("This shouldn't happen, like ever")
        return ""

    resp = requests.get(
        f"https://ctpcj.ro/orare/csv/orar_{bus_number}_{day}.csv",
        headers={"Referer": "https://ctpcj.ro/"},
    )
    if resp.status_code != 200 or "EROARE" in resp.text:
        return

    lines = [line.strip() for line in resp.text.split("\n")]
    start1, start2 = lines.pop(0).split(",")[1].split(" - ")
    days_of_week = lines.pop(0).split(",")[1]
    date_start = lines.pop(0).split(",")[1]
    lines.pop(0)  # start station
    lines.pop(0)  # stop station

    start1_times = []
    start2_times = []
    next_start1_index, next_start2_index = None, None
    for bus in lines:
        if not bus:
            continue
        start1_time, start2_time = bus.split(",")
        if start1_time:
            start1_times.append(start1_time)
        if start2_time:
            start2_times.append(start2_time)

        now_time = now.strftime("%H:%M")
        if start1_time and not next_start1_index and start1_time > now_time:
            next_start1_index = len(start1_times) - 1
        if start2_time and not next_start2_index and start2_time > now_time:
            next_start2_index = len(start2_times) - 1

    if not full_details:
        if not next_start1_index:
            for i, time in enumerate(reversed(start1_times)):
                if time.strip() == "Nu circula":
                    continue
                time = datetime.strptime(time, "%H:%M")
                if now.replace(
                    hour=time.hour, minute=time.minute, second=0, microsecond=0
                ) < now - timedelta(minutes=30):
                    break
                next_start1_index = len(start1_times) - i - 1

        if not next_start2_index:
            for i, time in enumerate(reversed(start2_times)):
                if time.strip() == "Nu circula":
                    continue
                time = datetime.strptime(time, "%H:%M")
                if now.replace(
                    hour=time.hour, minute=time.minute, second=0, microsecond=0
                ) < now - timedelta(minutes=30):
                    break
                next_start2_index = len(start2_times) - i - 1

    next_start1_index, next_start2_index = (
        next_start1_index or 0,
        next_start2_index or 0,
    )

    if not full_details:
        start1_rides = (
            start1_times[next_start1_index - 2 : next_start1_index]
            + [f"<b>{start1_times[next_start1_index]}</b>"]
            + start1_times[next_start1_index + 1 : next_start1_index + 5]
        )
        start2_rides = (
            start2_times[next_start2_index - 2 : next_start2_index]
            + [f"<b>{start2_times[next_start2_index]}</b>"]
            + start2_times[next_start2_index + 1 : next_start2_index + 5]
        )
    else:
        start1_rides = (
            start1_times[:next_start1_index]
            + [f"<b>{start1_times[next_start1_index]}</b>"]
            + start1_times[next_start1_index + 1 :]
        )
        start2_rides = (
            start2_times[:next_start2_index]
            + [f"<b>{start2_times[next_start2_index]}</b>"]
            + start2_times[next_start2_index + 1 :]
        )

    return (
        f"<b>[{bus_number}] {start1} - {start2}</b>\n"
        f"{days_of_week}\n\n"
        "<b>Next</b>\n"
        f"{start1}: <b>{start1_times[next_start1_index]}</b>\n"
        f"{start2}: <b>{start2_times[next_start2_index]}</b>\n\n"
        f"<b>{start1}</b>\n{' | '.join(start1_rides)}\n"
        f"<b>{start2}</b>\n{' | '.join(start2_rides)}\n\n"
        f"{'' if start1_times + start2_times else f'Start date: {date_start}'}"
        f"<a href='https://ctpcj.ro/orare/pdf/orar_{bus_number}.pdf'>PDF version</a>"
    )


class BusInline(BaseInlines):
    PER_PAGE = 24

    @classmethod
    def get_lines_markup(cls, bus_type, lines, count, last_page, page=1):
        buttons = [
            [
                Button("♻️", callback_data=f"bus sync {bus_type}"),
                Button("👆", callback_data=f"bus start"),
                Button("✅", callback_data="end"),
            ]
        ]

        if count > cls.PER_PAGE:
            buttons[0].insert(
                0,
                Button(
                    "👈",
                    callback_data=f"bus fetch_lines {bus_type} {page - 1 if page > 1 else last_page}",
                ),
            )
            buttons[0].append(
                Button(
                    "👉",
                    callback_data=f"bus fetch_lines {bus_type} {page + 1 if page != last_page else 1}",
                )
            )

        start = (page - 1) * cls.PER_PAGE if page - 1 >= 0 else 0
        lines = lines[start : start + cls.PER_PAGE]
        return Keyboard(
            [
                [
                    Button(
                        line['name'],
                        callback_data=f"bus fetch {line['name']} {bus_type} {page}",
                    )
                    for line in chunk
                ]
                for chunk in chunks(lines, 4)
            ]
            + buttons
        )

    @classmethod
    def get_markup(cls, bus):
        return Keyboard(
            [
                [
                    Button(
                        f"{bus_type.capitalize()} ({len(bus[bus_type])})",
                        callback_data=f"bus fetch_lines {bus_type}",
                    )
                ]
                for bus_type in bus.keys()
                if bus_type != "urls"
            ]
            + [
                [
                    Button("✅", callback_data="end"),
                ],
            ]
        )

    @classmethod
    def get_bottom_markup(cls, bus_type, page, _id, full_details):
        buttons = [
            Button(
                "👆", callback_data=f"bus fetch_lines {bus_type} {page}"
            ),
            Button(
                "🎯" if full_details else "📜",
                callback_data=f"bus fetch {_id} {bus_type} {page}{'' if full_details else ' full_details'}",
            ),
            Button("✅", callback_data="end"),
        ]
        return Keyboard([buttons])

    @classmethod
    def fetch(cls, update, _id, bus_type, page, full_details=False):
        message = update.callback_query.message
        return edit_message(
            update.callback_query.bot,
            message.chat_id,
            message.message_id,
            fetch_line(_id.upper(), full_details),
            reply_markup=cls.get_bottom_markup(
                bus_type, int(page), _id, full_details
            )
        )

    @classmethod
    def fetch_lines(cls, update, bus_type, page=1):

        lines = sorted(
            Bot.objects.get(additional_data__bus__isnull=False).additional_data["bus"][
                bus_type
            ],
            key=itemgetter("name"),
        )
        count = len(lines)
        last_page = math.ceil(count / cls.PER_PAGE)

        message = update.callback_query.message
        return edit_message(
            update.callback_query.bot,
            message.chat_id,
            message.message_id,
            text=f"{bus_type.capitalize()} lines [{page}/{last_page}]",
            reply_markup=cls.get_lines_markup(
                bus_type, lines, count, last_page, int(page)
            ),
            logger=logger,
        )

    @classmethod
    def start(cls, update):
        try:
            instance = Bot.objects.get(additional_data__bus__isnull=False)
        except Bot.DoesNotExist:
            logger.exception("Bot with bus config not found.")
            return update.message.reply_text("Coming soon")

        bus = instance.additional_data["bus"]
        if not ("urban" in bus.keys() and "metropolitan" in bus.keys()):
            logger.error("urban or metropolitan missing from bus lines config")
            return update.message.reply_text("Coming soon.")

        if not update.callback_query:
            user = update.message.from_user
            logger.info("User %s started the conversation.", user.full_name)

            return update.message.reply_text(
                f"Welcome {user.full_name}\nChoose a bus type",
                reply_markup=cls.get_markup(bus),
            ).to_json()

        message = update.callback_query.message
        user = update.callback_query.from_user
        return edit_message(
            update.callback_query.bot,
            chat_id=message.chat_id,
            message_id=message.message_id,
            text=f"Hi {user.full_name}, choose a bus type",
            reply_markup=cls.get_markup(bus),

        )

    @classmethod
    def sync(cls, update, bus_type):
        try:
            instance = Bot.objects.get(additional_data__bus__isnull=False)
        except Bot.DoesNotExist:
            logger.exception("Bot with bus config not found.")
            return update.message.reply_text("Coming soon")
        bus = instance.additional_data["bus"]
        url = bus["urls"]["lines"].format(
            f"{bus_type}{'e' if bus_type != 'supermarket' else ''}"
        )
        bot = update.callback_query.bot
        message = update.callback_query.message

        soup = scraper.fetch(url, logger)
        if isinstance(soup, Exception) or "EROARE" in soup.text:
            logger.error(soup)
            return edit_message(
                bot,
                chat_id=message.chat_id,
                message_id=message.message_id,
                text=str(soup),
                reply_markup=cls.get_markup(bus),
            )
        lines = []
        for item in soup.find_all("div", {"class": "element"}):
            name = (
                item.find("h6", {"itemprop": "name"})
                .text.strip()
                .replace("Linia ", "")
                .replace("Cora ", "")
            )
            route = item.find("div", {"class": "ruta"}).text.strip()
            lines.append({"name": name, "route": route})
        instance.additional_data["bus"][bus_type] = sorted(
            lines, key=itemgetter("name")
        )
        instance.save()

        return edit_message(
            bot,
            chat_id=message.chat_id,
            message_id=message.message_id,
            text="Synced 👌",
            reply_markup=cls.get_markup(bus),
        )
