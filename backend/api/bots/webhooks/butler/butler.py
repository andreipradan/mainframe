import logging
import random
from datetime import datetime

import pytz
import requests
import six
import telegram

from google.api_core.exceptions import GoogleAPICallError
from google.auth.exceptions import DefaultCredentialsError
from google.cloud import translate_v2 as translate
from google.cloud.exceptions import BadRequest

from api.bots.webhooks.butler.inlines import SavedMessagesInlines
from api.bots.webhooks.shared import reply
from bots.clients import mongo as database
from bots.management.commands.set_hooks import get_ngrok_url
from earthquakes.management.commands.base_check import parse_event
from earthquakes.models import Earthquake

logger = logging.getLogger(__name__)

ALLOWED_COMMANDS = [
    "bus",
    "get_chat_id",
    "randomize",
    "save",
    "saved",
    "translate",
]


def call(data, instance):
    bot = instance.telegram_bot
    update = telegram.Update.de_json(data, bot)
    message = update.message

    if update.callback_query:
        data = update.callback_query.data
        callback, *args = data.split(" ")
        if callback == "end":
            return SavedMessagesInlines.end(update)
        if not args:
            return logger.error(f"No chat id for callback query data: {data}")

        saved_inline = SavedMessagesInlines(args.pop(0))
        method = getattr(saved_inline, callback, None)
        if not method:
            return logger.error(f"Unhandled callback: {data}")
        return method(update, *args)

    if not message or not getattr(message, "chat", None) or not message.chat.id:
        return logger.info(f"No message or chat: {update.to_dict()}")

    if message.new_chat_title:
        chat_description = bot.get_chat(update.message.chat_id).description
        save_to_db(update.message, text_override=chat_description)
        return reply(update, text="Saved ✔")

    if message.new_chat_members:
        new_members = [u.full_name for u in message.new_chat_members]
        return reply(update, f"Welcome {', '.join(new_members)}!")

    if message.left_chat_member:
        return reply(update, f"Bye {message.left_chat_member.full_name}! 😢")

    from_user = update.message.from_user
    user = f"Name: {from_user.full_name}. Username: {from_user.username}. ID: {from_user.id}"
    if not message.text:
        return logger.info(f"No message text: {update.to_dict()}. From: {user}")

    if str(from_user.username or from_user.id) not in instance.whitelist:
        return logging.error(f"Ignoring message from: {user}")

    if not message.text.startswith("/"):
        return logger.warning(f"Invalid command: '{message.text}'. From: {user}")

    cmd, *args = message.text[1:].split(" ")

    if cmd == "bus":
        if len(args) != 1:
            return reply(update, f"Only 1 bus number allowed, got: {len(args)}")

        bus_number = args[0]

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

        headers = {"Referer": "https://ctpcj.ro/"}
        resp = requests.get(
            f"https://ctpcj.ro/orare/csv/orar_{bus_number}_{day}.csv",
            headers=headers,
        )
        if resp.status_code != 200 or "EROARE" in resp.text:
            return update.message.reply_text(
                text=f"Bus {bus_number} not found",
                parse_mode=telegram.ParseMode.HTML,
                disable_notification=True,
            ).to_json()

        lines = [line.strip() for line in resp.text.split("\n")]
        route = lines.pop(0).split(",")[1]
        days_of_week = lines.pop(0).split(",")[1]
        date_start = lines.pop(0).split(",")[1]
        lines.pop(0)  # start station
        lines.pop(0)  # stop station

        current_bus_index = None
        current_bus = lines[0]
        for i, bus in enumerate(lines):
            start, *stop = bus.split(",")
            now_time = now.strftime("%H:%M")
            if start > now_time or (stop and stop[0] > now_time):
                current_bus_index = i
                current_bus = lines[i]
                break

        if current_bus_index:
            lines = (
                lines[current_bus_index - 3 : current_bus_index]
                + lines[current_bus_index : current_bus_index + 3]
            )

        all_rides = "\n".join(lines)
        text = (
            f"Next <b>{bus_number}</b> "
            f"at {current_bus}\n\n{route}\n{days_of_week}:\n"
            f"(Available from: {date_start}) \n{all_rides}"
        )
        return reply(update, text=text)

    if cmd == "earthquake":
        earthquake = instance.additional_data.get("earthquake")
        if not earthquake or not (
            latest := Earthquake.objects.order_by("-timestamp").first()
        ):
            return reply(update, text=f"No earthquakes stored")
        if len(args) == 2 and args[0] == "set_min_magnitude":
            instance.additional_data["earthquake"]["min_magnitude"] = args[1]
            instance.save()
            return reply(update, text=f"Updated min magnitude to {args[1]}")
        return reply(
            update,
            text=f"{parse_event(latest)}\nLast check: {earthquake['last_check']}",
        )

    if cmd == "get_chat_id":
        return reply(update, text=f"Chat ID: {update.message.chat_id}")

    if cmd == "mainframe":
        return reply(update, text=get_ngrok_url())

    if cmd == "randomize":
        if len(args) not in range(2, 51):
            return reply(update, "Must contain a list of 2-50 items separated by space")
        random.shuffle(args)
        return reply(update, "\n".join(f"{i+1}. {item}" for i, item in enumerate(args)))

    if cmd == "save":
        if not update.message.reply_to_message:
            return reply(
                update,
                text="This command must be sent as a reply to the message you want to save",
            )
        if not (
            update.message.reply_to_message.text
            or update.message.reply_to_message.new_chat_title
        ):
            return reply(update, text="No text found to save.")

        save_to_db(
            update.message.reply_to_message,
            text_override=bot.get_chat(update.message.chat_id).description
            if update.message.reply_to_message.new_chat_title
            else None,
        )
        return reply(update, text="Saved ✔")

    if cmd == "saved":
        chat_id = update.message.chat_id
        if args and args[0].lstrip("-").isnumeric():
            chat_id = int(args[0])
        return SavedMessagesInlines(chat_id).start(update, page=1)

    if cmd == "translate":
        return reply(update, translate_text(" ".join(args)))

    logger.error(f"Unhandled: {update.to_dict()}")


def translate_text(text):
    if len(text) > 255:
        return f"Too many characters. Try sending less than 255 characters"

    if not text.strip():
        return "Missing text to translate"

    help_text = (
        "/translate <insert text here>\n"
        "/translate target=<language_code> <insert text here>\n"
        "Language codes here: https://cloud.google.com/translate/docs/languages"
    )
    if text == "help":
        return help_text

    kwargs = text.split(" ")[0].split("=")
    if len(kwargs) == 2 and kwargs[0] == "target":
        if not kwargs[1]:
            return help_text

        target = kwargs[1]
        text = " ".join(text.split(" ")[1:])
        if not text.strip():
            return help_text
    else:
        target = "en"

    try:
        translate_client = translate.Client()
    except DefaultCredentialsError:
        return "Couldn't authenticate to google cloud"

    if isinstance(text, six.binary_type):
        text = text.decode("utf-8")

    # Text can also be a sequence of strings, in which case this method
    # will return a sequence of results for each text.
    try:
        result = translate_client.translate(
            text, target_language=target, format_="text"
        )
    except (GoogleAPICallError, BadRequest) as e:
        logger.error(e)
        return "Something went wrong. For usage and examples type '/translate help'."

    return (
        "💬 Translate\n"
        f"[{result['detectedSourceLanguage']}] {result['translatedText']}"
    )


def save_to_db(message, text_override=None):
    author = message.from_user.to_dict()
    author["full_name"] = message.from_user.full_name
    database.get_collection("saved-messages").insert_one(
        {
            "author": author,
            "chat_id": message.chat_id,
            "chat_name": message.chat.title,
            "date": message.date,
            "message": {
                "id": message.message_id,
                "text": text_override or message.text,
            },
            "saved_at": message.date.utcnow(),
            "saved_by": message.from_user.to_dict(),
        }
    )
