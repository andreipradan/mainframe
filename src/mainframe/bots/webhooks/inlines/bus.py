import math
from datetime import datetime
from typing import List

import pytz
from django.conf import settings
from mainframe.bots.webhooks.shared import BaseInlines, chunks
from mainframe.clients.chat import edit_message
from mainframe.clients.ctp import CTPClient
from mainframe.clients.logs import get_default_logger
from mainframe.transit_lines.models import Schedule, TransitLine
from telegram import InlineKeyboardButton as Button
from telegram import InlineKeyboardMarkup as Keyboard

logger = get_default_logger(__name__)


def get_next_time(times: List[str], now):
    for time in times:
        if time > now:
            return time
    return times[0] if times else None


def parse_schedule(schedule: Schedule, now: str, full_details=False):
    start1 = schedule.line.terminal1
    start2 = schedule.line.terminal2

    t1_times = schedule.terminal1_schedule
    t2_times = schedule.terminal2_schedule

    t1_next_time = get_next_time(t1_times, now)
    t2_next_time = get_next_time(t2_times, now)

    if not full_details:
        if t1_times:
            if (next1_index := t1_times.index(t1_next_time)) < 2:  # noqa: PLR2004
                next1_index = 2
            t1_times = t1_times[next1_index - 2 : next1_index + 2]
        if t2_times:
            if (next2_index := t2_times.index(t2_next_time)) < 2:  # noqa: PLR2004
                next2_index = 2
            t2_times = t2_times[next2_index - 2 : next2_index + 2]

    start1_times = [t if t != t1_next_time else f"<b>{t}</b>" for t in t1_times]
    start2_times = [t if t != t2_next_time else f"<b>{t}</b>" for t in t2_times]
    has_times = bool(t1_times + t2_times)
    return (
        f"<b>[{schedule.line.name}]{'[🚲]' if schedule.line.has_bike_rack else ''} "
        f"{start1} - {start2}</b>\n"
        f"{schedule.get_occurrence_display()}\n\n"
        "<b>Next</b>\n"
        f"{start1}: <b>{t1_next_time}</b>\n"
        f"{start2}: <b>{t2_next_time}</b>\n\n"
        f"<b>{start1}</b>\n{' | '.join(start1_times)}\n"
        f"<b>{start2}</b>\n{' | '.join(start2_times)}\n"
        f"{'' if has_times else f'Start date: {schedule.schedule_start_date}'}\n"
        f"<a href='https://ctpcj.ro/orare/pdf/orar_{schedule.line.name}.pdf'>"
        "PDF version</a>\n"
        f"<a href='https://ctpcj.ro/orare/harta/{schedule.line.name}.jpeg'>"
        "Route map</a> (if available)"
    )


class BusInline(BaseInlines):
    PER_PAGE = 24

    @classmethod
    def get_markup(  # noqa: PLR0913
        cls,
        line_type: str,
        lines: List[TransitLine],
        count: int,
        last_page: int,
        page=1,
    ):
        line_type_buttons = [[]]
        navigation_buttons = [[Button("✅", callback_data="end")]]

        navigation_buttons[0].insert(
            0, Button("♻️", callback_data=f"bus sync {line_type}")
        )
        if line_type != "favorites":
            line_type_buttons[0].append(Button("⭐️", callback_data="bus start"))
        if line_type != TransitLine.LINE_TYPE_URBAN:
            line_type_buttons[0].append(
                Button("🚍", callback_data=f"bus start {TransitLine.LINE_TYPE_URBAN}")
            )
        if line_type != TransitLine.LINE_TYPE_EXPRESS:
            line_type_buttons[0].append(
                Button("🚇", callback_data=f"bus start {TransitLine.LINE_TYPE_EXPRESS}")
            )
        if line_type != TransitLine.LINE_TYPE_METROPOLITAN:
            line_type_buttons[0].append(
                Button(
                    "Ⓜ️",
                    callback_data=f"bus start {TransitLine.LINE_TYPE_METROPOLITAN}",
                )
            )

        if count > cls.PER_PAGE:
            navigation_buttons[0].insert(
                0,
                Button(
                    "👈",
                    callback_data=(
                        f"bus start {line_type} {page - 1 if page > 1 else last_page}"
                    ),
                ),
            )
            navigation_buttons[0].append(
                Button(
                    "👉",
                    callback_data=(
                        f"bus start {line_type} {page + 1 if page != last_page else 1}"
                    ),
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
            + line_type_buttons
            + navigation_buttons
        )

    @classmethod
    def get_bottom_markup(cls, line_type, page, line_name, full_details):
        callback = (
            f"bus fetch {line_name} {line_type} "
            f"{page}{'' if full_details else ' full_details'}"
        )
        if line_type == "favorites":
            favicon = "🗑"
            fav_method = "remove_from_favorites"
        else:
            favicon = "⭐️"
            fav_method = "add_to_favorites"
        buttons = [
            Button("👆", callback_data=f"bus start {line_type} {page}"),
            Button(favicon, callback_data=f"bus {fav_method} {line_name}"),
            Button("🎯" if full_details else "📜", callback_data=callback),
            Button("✅", callback_data="end"),
        ]

        return Keyboard([buttons])

    @classmethod
    def add_to_favorites(cls, update, line_name):
        user = update.callback_query.from_user
        line = TransitLine.objects.get(name=line_name)
        line.add_to_favorites(user.username or user.id)
        return cls.start(update)

    @classmethod
    def remove_from_favorites(cls, update, line_name):
        user = update.callback_query.from_user
        line = TransitLine.objects.get(name=line_name)
        line.remove_from_favorites(user.username or user.id)
        return cls.start(update)

    @classmethod
    def fetch(  # noqa: PLR0913
        cls, update, line_name, line_type, page, full_details=False
    ):
        now = datetime.now(pytz.timezone(settings.TIME_ZONE))
        weekday = now.weekday()
        if weekday in range(5):
            day = "lv"
        elif weekday == 5:  # noqa: PLR2004
            day = "s"
        elif weekday == 6:  # noqa: PLR2004
            day = "d"
        else:
            logger.error("This shouldn't happen, like ever")
            return ""
        message = update.callback_query.message
        try:
            schedule = Schedule.objects.select_related("line").get(
                line__name=line_name.upper(), occurrence=day
            )
            text = parse_schedule(schedule, now.strftime("%H:%M"), full_details)
        except Schedule.DoesNotExist:
            text = f"Scheduled for {line_name} not found"
        return edit_message(
            update.callback_query.bot,
            message.chat_id,
            message.message_id,
            text=text,
            reply_markup=cls.get_bottom_markup(
                line_type, int(page), line_name, full_details
            ),
        )

    @classmethod
    def start(cls, update, line_type="favorites", page=1, override_message=None):
        user = (
            update.callback_query.from_user
            if update.callback_query
            else update.message.from_user
        )

        page = int(page)
        start = (page - 1) * cls.PER_PAGE if page - 1 >= 0 else 0
        qs = TransitLine.objects
        if line_type == "favorites":
            qs = qs.filter(favorite_of__contains=[user.username or user.id])
        else:
            qs = qs.filter(line_type=line_type)

        lines = list(qs.order_by("name")[start : start + cls.PER_PAGE])
        count = qs.count()

        last_page = math.ceil(count / cls.PER_PAGE)

        no_lines_msg = f"\n{'' if lines else f'No {line_type} found'}"
        pagination = f" [{page}/{last_page}]" if last_page and last_page != 1 else ""

        markup = cls.get_markup(line_type, lines, count, last_page, int(page))

        if not update.callback_query:
            logger.info("User %s started the conversation.", user.full_name)
            return update.message.reply_text(
                f"Welcome {user.full_name}\nChoose your favorite line",
                reply_markup=markup,
            ).to_json()

        message = update.callback_query.message
        return edit_message(
            update.callback_query.bot,
            message.chat_id,
            message.message_id,
            text=override_message
            or f"{line_type.capitalize()} lines{pagination}{no_lines_msg}",
            reply_markup=markup,
        )

    @classmethod
    def sync(cls, update, line_type):
        if line_type == "favorites":
            user = (
                update.callback_query.from_user
                if update.callback_query
                else update.message.from_user
            )
            lines = list(
                TransitLine.objects.filter(
                    favorite_of__contains=[user.username or user.id]
                )
            )
        else:
            lines = list(TransitLine.objects.filter(line_type=line_type))
        CTPClient.fetch_schedules(lines)
        override_message = f"Synced schedules for {len(lines)} {line_type} lines 👌"
        return cls.start(update, line_type=line_type, override_message=override_message)
