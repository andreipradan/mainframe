import logging
import random

import six
import telegram
from django.conf import settings
from django.core.management import CommandError
from google.api_core.exceptions import GoogleAPICallError
from google.auth.exceptions import DefaultCredentialsError
from google.cloud import translate_v2 as translate
from google.cloud.exceptions import BadRequest

from bots.webhooks.inlines.bus import BusInline
from bots.webhooks.inlines.meals import MealsInline
from bots.webhooks.inlines.saved_messages import SavedMessagesInlines
from bots.webhooks.shared import reply
from bots.management.commands.check_whos_next import whos_next
from bots.management.commands.set_hooks import get_ngrok_url
from bots.models import Bot, Message
from clients.logs import MainframeHandler
from earthquakes.management.commands.base_check import parse_event
from earthquakes.models import Earthquake
from finance.tasks import finance_import

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


def call(data, instance: Bot):
    bot = instance.telegram_bot
    update = telegram.Update.de_json(data, bot)

    if update.callback_query:
        data = update.callback_query.data
        callback, *args = data.split(" ")
        if callback == "end":
            return SavedMessagesInlines.end(update)
        if not args:
            return logger.error("No args for callback query data: %s", data)
        if callback in ["bus", "meal"]:
            inline = MealsInline if callback == "meal" else BusInline
            try:
                return getattr(inline, args.pop(0))(update, *args)
            except (AttributeError, TypeError) as e:
                logger.error("E: %s, args: %s", e, args)
                return ""

        saved_inline = SavedMessagesInlines(args.pop(0))
        method = getattr(saved_inline, callback, None)
        if not method:
            return logger.error("Unhandled callback: %s", data)
        return method(update, *args)

    message = update.message
    if not message or not getattr(message, "chat", None) or not message.chat.id:
        return logger.info("No message or chat: %s", update.to_dict())

    if message.new_chat_title:
        if (
            isinstance(config := instance.additional_data.get("whos_next", None), dict)
            and config.get("chat_id", None) == message.chat_id
        ):
            save_to_db(update.message, chat=bot.get_chat(update.message.chat_id))
            config["posted"] = True
            instance.save()
            return reply(update, text="Saved ✔")
        return logger.info(f"[{message.chat_id}] New chat title: {message.chat.title}")

    if message.new_chat_members:
        new_members = [u.full_name for u in message.new_chat_members]
        return reply(update, f"Welcome {', '.join(new_members)}!")

    if message.left_chat_member:
        return reply(update, f"Bye {message.left_chat_member.full_name}! 😢")

    from_user = update.message.from_user
    user = (
        f"Name: {from_user.full_name}. "
        f"Username: {from_user.username}. ID: {from_user.id}"
    )
    if str(from_user.username or from_user.id) not in instance.whitelist:
        return logger.error("Ignoring message from: %s", user)

    if message.document:
        file_name = message.document.file_name
        extension = file_name.split(".")[-1].lower()
        bank = None
        if extension == "csv" and file_name.startswith("account-statement"):
            bank = "revolut"
            doc_type = "statements"
        elif extension == "xlsx" and file_name.startswith("Extras_de_cont"):
            bank = "raiffeisen"
            doc_type = "statements"
        elif extension == "pdf":
            if file_name.startswith("Tranzactii"):
                doc_type = "payments"
            elif file_name.startswith("Scadentar"):
                doc_type = "timetables"
            else:
                return logger.error("Unhandled pdf type")
        elif (stock_type := message.caption.lower().replace(" ", "_")) in [
            "stock_pnl",
            "stock_transactions",
        ]:
            doc_type = stock_type
        else:
            return logger.error("Unhandled document: %s", file_name)

        logger.info("Got %s saving...", extension)
        path = settings.BASE_DIR / "finance" / "data" / doc_type / file_name
        bot.get_file(message.document.file_id).download(path)

        logger.info("Saved %s: %s", doc_type, file_name)

        import_kwargs = {"doc_type": doc_type}
        if bank:
            import_kwargs["bank"] = bank
        finance_import(**import_kwargs)

        return reply(update, f"Saved {doc_type}: {file_name}")

    if not message.text:
        return logger.info("No message text: %s. From: %s", update.to_dict(), user)

    if not message.text.startswith("/"):
        return logger.warning("Invalid command: '%s'. From: %s", message.text, user)

    cmd, *args = message.text[1:].split(" ")
    if "bot_command" in [e.type for e in update.message.entities]:
        cmd = cmd.replace(f"@{instance.username}", "")

    if cmd == "bus":
        return BusInline.start(update)

    if cmd == "earthquake":
        earthquake = instance.additional_data.get("earthquake")
        if not earthquake or not (
            latest := Earthquake.objects.order_by("-timestamp").first()
        ):
            return reply(update, text="No earthquakes stored")
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
        url = get_ngrok_url()
        return reply(update, text=url or "Could not find mainframe URL")

    if cmd == "meals":
        return MealsInline.start(update, page=1)

    if cmd == "next":
        try:
            return reply(update, whos_next()[0])
        except CommandError as e:
            return reply(update, str(e))

    if cmd == "randomize":
        if len(args) not in range(2, 51):
            return reply(update, "Must contain a list of 2-50 items separated by space")
        random.shuffle(args)
        return reply(update, "\n".join(f"{i+1}. {item}" for i, item in enumerate(args)))

    if cmd == "save":
        message = update.message.reply_to_message
        if not message:
            return reply(
                update,
                text="This command must be sent as a reply to the "
                "message you want to save",
            )
        if message.text:
            save_to_db(message, bot.get_chat(message.chat_id), text=message.text)
            return reply(update, text="Saved message ✔")

        if message.new_chat_title:
            chat = bot.get_chat(message.chat_id)
            save_to_db(message, chat=chat)
            return reply(update, text="Saved title ✔")

        return reply(update, text="No text/title found to save.")

    if cmd == "saved":
        chat_id = update.message.chat_id
        if args and args[0].lstrip("-").isnumeric():
            chat_id = int(args[0])
        return SavedMessagesInlines(chat_id).start(update, page=1)

    if cmd == "tema":
        if config := instance.additional_data.get("whos_next", None):
            if not args:
                try:
                    name = config["theme"]["name"]
                    user = config["theme"]["user"]
                    return reply(update, f"Tema e: {name}, propusă de {user}")
                except (KeyError, TypeError):
                    return reply(update, "Nu e nici o temă propusă")
            name = " ".join(args)
            config["theme"] = {"name": name, "user": user}
            instance.save()
            return reply(update, f'"{name}" - bun, am notat')
        return logger.info(f"[{message.chat_id}] who's next config not found")

    if cmd == "translate":
        return reply(update, translate_text(" ".join(args)))

    logger.error("Unhandled: %s", update.to_dict())


def translate_text(text):
    if len(text) > 255:
        return "Too many characters. Try sending less than 255 characters"

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


def save_to_db(message, chat, text=None):
    author = message.from_user.to_dict()
    author["full_name"] = message.from_user.full_name
    text = text or chat.description
    title = (
        message.chat.title
        or f"{chat.bot.first_name if chat.type == 'private' else chat.id} ({chat.type})"
    )
    Message.objects.create(
        author=author,
        chat_id=message.chat_id,
        chat_title=title,
        date=message.date,
        message_id=message.message_id,
        saved_by=message.from_user.to_dict(),
        text=text,
    )
