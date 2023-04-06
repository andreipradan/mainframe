import logging
import math
from operator import itemgetter
from typing import List

import pytz
from telegram import InlineKeyboardButton as Button, InlineKeyboardMarkup as Keyboard

from api.bots.webhooks.shared import BaseInlines, chunks
from bots.models import Bot
from clients import scraper
from clients.telegram import edit_message
from datetime import datetime

from clients.ctp import LINE_TYPES
from transit_lines.models import TransitLine, Schedule

logger = logging.getLogger(__name__)


def get_next_time(times: List[str], now):
    for time in times:
        if time > now:
            return time
    return times[0] if times else None


def parse_schedule(schedule: Schedule, now: str, full_details=False):
    start1 = schedule.line.terminal1
    start2 = schedule.line.terminal2

    terminal1_times = schedule.terminal1_schedule
    terminal2_times = schedule.terminal2_schedule

    terminal1_next_time = get_next_time(terminal1_times, now)
    terminal2_next_time = get_next_time(terminal2_times, now)

    if not full_details:
        next1_index = terminal1_next_time.index(terminal1_next_time)
        if next1_index < 2:
            next1_index = 2
        terminal1_times = terminal1_times[next1_index - 2:next1_index+2]

        next2_index = terminal2_times.index(terminal2_next_time)
        if next2_index < 2:
            next2_index = 2
        terminal2_times = terminal2_times[next2_index - 2:next2_index+2]

    return (
        f"<b>[{schedule.line.name}] {start1} - {start2}</b>\n"
        f"{schedule.get_occurrence_display()}\n\n"
        "<b>Next</b>\n"
        f"{start1}: <b>{terminal1_next_time}</b>\n"
        f"{start2}: <b>{terminal2_next_time}</b>\n\n"
        f"<b>{start1}</b>\n{' | '.join([t if t != terminal1_next_time else f'<b>{t}</b>' for t in terminal1_times])}\n"
        f"<b>{start2}</b>\n{' | '.join([t if t != terminal2_next_time else f'<b>{t}</b>' for t in terminal2_times])}\n"
        f"{'' if terminal1_times + terminal2_times else f'Start date: {schedule.schedule_start_date}'}"
        f"<a href='https://ctpcj.ro/orare/pdf/orar_{schedule.line.name}.pdf'>PDF version</a>"
    )


class BusInline(BaseInlines):
    PER_PAGE = 24

    @classmethod
    def get_lines_markup(cls, line_type: str, lines: List[TransitLine], count: int, last_page: int, page=1):
        buttons = [
            [
                Button("♻️", callback_data=f"bus sync {line_type}"),
                Button("👆", callback_data=f"bus start"),
                Button("✅", callback_data="end"),
            ]
        ]

        if count > cls.PER_PAGE:
            buttons[0].insert(
                0,
                Button(
                    "👈",
                    callback_data=f"bus fetch_lines {line_type} {page - 1 if page > 1 else last_page}",
                ),
            )
            buttons[0].append(
                Button(
                    "👉",
                    callback_data=f"bus fetch_lines {line_type} {page + 1 if page != last_page else 1}",
                )
            )

        return Keyboard(
            [
                [
                    Button(
                        f"{line.name}{' 🚲' if line.has_bike_rack else ''}",
                        callback_data=f"bus fetch {line.name} {line_type} {page}",
                    )
                    for line in chunk
                ]
                for chunk in chunks(lines, 4)
            ]
            + buttons
        )

    @classmethod
    def get_markup(cls):
        return Keyboard(
            [
                [
                    Button("Urban", callback_data=f"bus fetch_lines urban"),
                    Button("Metropolitan", callback_data=f"bus fetch_lines metropolitan"),
                ]
            ]
            + [
                [
                    Button("✅", callback_data="end"),
                ],
            ]
        )

    @classmethod
    def get_bottom_markup(cls, line_type, page, _id, full_details):
        buttons = [
            Button(
                "👆", callback_data=f"bus fetch_lines {line_type} {page}"
            ),
            Button(
                "🎯" if full_details else "📜",
                callback_data=f"bus fetch {_id} {line_type} {page}{'' if full_details else ' full_details'}",
            ),
            Button("✅", callback_data="end"),
        ]
        return Keyboard([buttons])

    @classmethod
    def fetch(cls, update, _id, line_type, page, full_details=False):
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
        schedule = Schedule.objects.select_related("line").get(line__name=_id.upper(), occurrence=day)
        message = update.callback_query.message
        return edit_message(
            update.callback_query.bot,
            message.chat_id,
            message.message_id,
            parse_schedule(schedule, now.strftime("%H:%M"), full_details),
            reply_markup=cls.get_bottom_markup(
                line_type, int(page), _id, full_details
            )
        )

    @classmethod
    def fetch_lines(cls, update, line_type, page=1):
        page = int(page)
        start = (page - 1) * cls.PER_PAGE if page - 1 >= 0 else 0
        lines = list(TransitLine.objects.filter(line_type=LINE_TYPES[line_type]).order_by("name")[start: start + cls.PER_PAGE])
        count = TransitLine.objects.filter(line_type=LINE_TYPES[line_type]).count()
        last_page = math.ceil(count / cls.PER_PAGE)

        message = update.callback_query.message
        return edit_message(
            update.callback_query.bot,
            message.chat_id,
            message.message_id,
            text=f"{line_type.capitalize()} lines [{page}/{last_page}]",
            reply_markup=cls.get_lines_markup(
                line_type, lines, count, last_page, int(page)
            ),
            logger=logger,
        )

    @classmethod
    def start(cls, update):

        if not update.callback_query:
            user = update.message.from_user
            logger.info("User %s started the conversation.", user.full_name)

            return update.message.reply_text(
                f"Welcome {user.full_name}\nChoose a line type",
                reply_markup=cls.get_markup(),
            ).to_json()

        message = update.callback_query.message
        user = update.callback_query.from_user
        return edit_message(
            update.callback_query.bot,
            chat_id=message.chat_id,
            message_id=message.message_id,
            text=f"Hi {user.full_name}, choose a bus type",
            reply_markup=cls.get_markup(),
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
