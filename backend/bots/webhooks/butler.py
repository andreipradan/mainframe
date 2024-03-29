import logging
import random

import telegram
from django.conf import settings
from django.core.management import CommandError

from bots.management.commands.check_whos_next import whos_next
from bots.management.commands.set_hooks import get_ngrok_url
from bots.models import Bot, Message
from bots.webhooks.inlines.bus import BusInline
from bots.webhooks.inlines.meals import MealsInline
from bots.webhooks.inlines.saved_messages import SavedMessagesInlines
from bots.webhooks.shared import reply
from clients.logs import MainframeHandler
from clients.translate import translate_text
from earthquakes.management.commands.base_check import parse_event
from earthquakes.models import Earthquake
from finance.tasks import finance_import

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


def call(data, instance: Bot):  # noqa: PLR0911, PLR0912, PLR0915, C901
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
            config["initial"] = False
            instance.save()
            return reply(update, text="Saved ✔")
        return logger.info(
            "[%s] New chat title: %s", message.chat.id, message.chat.title
        )

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
        if len(args) == 2 and args[0] == "set_min_magnitude":  # noqa: PLR2004
            instance.additional_data["earthquake"]["min_magnitude"] = args[1]
            instance.save()
            return reply(update, text=f"Updated min magnitude to {args[1]}")
        msg = parse_event(latest)
        if last_check := earthquake.get("last_check"):
            msg += f"\nLast check: {last_check}"
        return reply(update, text=msg)

    if cmd == "get_chat_id":
        return reply(update, text=f"Chat ID: {update.message.chat_id}")

    if cmd == "mainframe":
        url = get_ngrok_url()
        return reply(update, text=url or "Could not find mainframe URL")

    if cmd == "meals":
        return MealsInline.start(update, page=1)

    if cmd == "next":
        config = instance.additional_data.get("whos_next")
        try:
            return reply(update, whos_next(config))
        except CommandError as e:
            return reply(update, str(e))

    if cmd == "randomize":
        if len(args) not in range(2, 51):
            return reply(update, "Must contain 2-50 items separated by spaces")
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

    if cmd == "translate":
        if args == ["help"]:
            return reply(
                update,
                "/translate <insert text here>\n"
                "/translate target=<language_code> <insert text here>\n"
                "Language codes here: https://cloud.google.com/translate/docs/languages",
                parse_mode=None,
            )
        source, target = None, None
        if args and args[0].startswith("source="):
            source = args.pop(0).replace("source=", "")
        if args and args[0].startswith("target="):
            target = args.pop(0).replace("target=", "")

        text = " ".join(args)
        if len(text) > 255:  # noqa: PLR2004
            return reply(
                update, "Too many characters. Try sending less than 255 characters"
            )

        if not text.strip():
            return reply(update, "Missing text to translate")

        translation = translate_text(text, source=source, target=target)
        return reply(update, translation, parse_mode=None)

    logger.error("Unhandled: %s", update.to_dict())


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
