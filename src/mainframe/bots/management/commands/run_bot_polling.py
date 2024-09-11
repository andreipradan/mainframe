import ast
import random
import zlib

import environ
import logfire
import redis
import telegram
from django.core.management import BaseCommand, CommandError
from django.utils import timezone
from mainframe.bots.management.commands.inlines.bus import BusInline
from mainframe.bots.management.commands.inlines.lights import LightsInline
from mainframe.bots.management.commands.inlines.meals import MealsInline
from mainframe.bots.management.commands.inlines.saved_messages import (
    SavedMessagesInlines,
)
from mainframe.bots.management.commands.rotate_whos_next import whos_next
from mainframe.bots.models import Bot, Message
from mainframe.clients import dexonline
from mainframe.clients.gemini import GeminiError, generate_content
from mainframe.clients.logs import get_default_logger
from mainframe.earthquakes.management.commands.base_check import parse_event
from mainframe.earthquakes.models import Earthquake
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    CallbackContext,
    CallbackQueryHandler,
    CommandHandler,
    Filters,
    MessageHandler,
    Updater,
)

logger = get_default_logger(__name__)
BUS_PER_PAGE = 24


def is_whitelisted(func):
    def wrapper(update, context, *args, **kwargs):
        try:
            bot = Bot.objects.get(
                username=context.bot.username,
                whitelist__contains=[
                    update.effective_user.username or update.effective_user.id
                ],
            )
        except Bot.DoesNotExist:
            logger.warning("Not whitelisted: %s", update.effective_user)
            return
        bot.last_called_on = timezone.now()
        bot.save()
        return func(update, *args, bot=bot, context=context, **kwargs)

    return wrapper


class RedisContextClient:
    def __init__(self):
        self.client = redis.Redis(host="localhost", port=6379)

    def delete(self, key):
        self.client.delete(key)

    def get(self, key):
        try:
            if value := self.client.get(key):
                return ast.literal_eval(zlib.decompress(value).decode())
        except redis.exceptions.ConnectionError as e:
            logger.exception(e)

    def ping(self):
        return self.client.ping()

    def set(self, key, value):
        self.client.set(key, zlib.compress(str(value).encode()))


redis_client = RedisContextClient()


def handle_callback_query(update: Update, *_, bot, **__):
    query = update.callback_query
    query.answer()

    cmd, *args = query.data.split()
    if cmd == "end":
        return query.edit_message_text("See you next time!")

    if not args:
        return logger.error("No args for callback query data: %s", query.data)

    if cmd not in ["bus", "lights", "meals"]:
        saved_inline = SavedMessagesInlines(args.pop(0))
        if not (method := getattr(saved_inline, cmd, None)):
            return logger.error("Unhandled callback: %s", query.data)
        return method(update, *args)

    if cmd == "meals":
        inline = MealsInline
    elif cmd == "bus":
        inline = BusInline
    elif cmd == "lights":
        inline = LightsInline
    else:
        logger.error("Unhandled inline: %s", query.data)
        return
    method = args.pop(0)
    kwargs = {}
    if inline == LightsInline:
        kwargs["bot"] = bot
    try:
        return getattr(inline, method)(update, *args, **kwargs)
    except (AttributeError, TypeError) as e:
        logger.error("E: %s, args: %s", e, args)


def handle_chat_id(update: Update, *_, **__):
    return reply(update, f"Chat ID: {update.effective_chat.id}")


def handle_dex(update, context: CallbackContext, **__):
    if len(context.args) != 1 or not (word := context.args[0]):
        reply(update, "What do you want to search? (usage: '/dex <word>')")
        return

    try:
        word, definition = dexonline.fetch_definition(word=word)
    except dexonline.DexOnlineNotFoundError:
        logger.warning("DexOnline - word not found: '%s'", word)
        return reply(update, f"Couldn't find definition for '{word}'")
    except dexonline.DexOnlineError as e:
        logger.error(
            "DexOnlineError: '%s'. Update: '%s'. Context: '%s'",
            e,
            update.to_dict(),
            context,
        )
        return reply(update, f"Couldn't find definition for '{word}'")
    return reply(update, text=f"{word}: {definition}")


def handle_earthquake(update, context: CallbackContext, bot, **__):
    config = bot.additional_data.get("earthquake")

    if not config:
        return reply(update, text="No earthquake configuration found")

    if not (latest := Earthquake.objects.order_by("-timestamp").first()):
        return reply(update, text="No earthquakes stored")

    args = context.args
    if len(args) == 2 and args[0] == "set_min_magnitude":  # noqa: PLR2004
        bot.additional_data["earthquake"]["min_magnitude"] = args[1]
        bot.save()
        return reply(update, text=f"Updated min magnitude to {args[1]}")

    msg = parse_event(latest)
    if last_check := config.get("last_check"):
        msg += f"\nLast check: {last_check}"
    return reply(update, text=msg)


def handle_left_chat_member(update: Update, *_, **__) -> None:
    return reply(update, f"Bye {update.message.left_chat_member.full_name}! 😢")


def handle_next(update: Update, *_, bot: Bot, **__):
    try:
        return reply(update, whos_next(bot.additional_data.get("whos_next")))
    except CommandError as e:
        return reply(update, str(e))


def handle_new_chat_members(update: Update, *_, **__) -> None:
    new_members = [u.full_name for u in update.message.new_chat_members]
    return reply(update, f"Welcome {', '.join(new_members)}!")


def handle_new_chat_title(update: Update, context: CallbackContext, bot: Bot) -> None:
    chat_id = update.effective_chat.id
    if bot.additional_data.get("whos_next", {}).get("chat_id") != chat_id:
        logger.info("[%s] New chat title: %s", chat_id, update.effective_chat.title)
        return

    config = bot.additional_data["whos_next"]
    save_to_db(update.message, chat=context.bot.get_chat(chat_id))
    config["posted"] = True
    config["initial"] = False
    bot.save()
    return reply(update, text="Saved ✔")


def handle_process_message(update: Update, context: CallbackContext, *_, **__) -> None:
    if not (message := update.message):
        return logger.error("No message in '%s'", update.to_dict())

    text = getattr(message, "text", "") or message.caption or ""
    if not (context.bot.username in text or update.effective_chat.type == "private"):
        return logger.info("No tag or caption")

    if not redis_client.ping():
        logger.error("Can't connect to redis")
        return

    role = update.effective_user.full_name
    context_key = f"context:{update.effective_chat.id}"
    history = [{"role": role, "parts": "You can use emojis"}]
    if not (state := redis_client.get(context_key)):
        state = {"history": history}
        logger.info("Adding initial context: '%s'", context_key)

    if not state.get("history"):
        state["history"] = history

    file_path = None
    if update.message.photo:
        file_path = update.message.photo[-1].get_file().download()
        # TODO: set uploaded docs (name from genai.upload_file) in redis -
        #  clear them on handle_clear
    elif doc := update.message.document:
        file_path = doc.get_file().download()

    state["history"].append({"role": role, "parts": text})
    try:
        response = generate_content(
            prompt=text, history=state["history"], file_path=file_path
        )
    except GeminiError as e:
        logger.exception(e)
        reply(update, "Got an error trying to process your message")
    else:
        state["history"].append({"role": "model", "parts": response})
        redis_client.set(context_key, state)

        reply(update, response.replace("**", "").replace("*", "\*"))


def handle_randomize(update: Update, context: CallbackContext, **__) -> None:
    if len(args := context.args) not in range(2, 51):
        return reply(update, "Must contain 2-50 items separated by spaces")
    random.shuffle(args)
    return reply(update, "\n".join(f"{i + 1}. {item}" for i, item in enumerate(args)))


def handle_reset(update: Update, *_, **__) -> None:
    storage_key = f"context:{update.effective_chat.id}:{update.effective_user.id}"
    if state := redis_client.get(storage_key):
        state["history"] = []
        reply(update, "My memory was erased! Who are you? 😄")
    else:
        reply(update, "No previous memories to reset 📛")


def handle_save(update: Update, context: CallbackContext, **__) -> None:
    message = update.message.reply_to_message
    if not message:
        return reply(
            update,
            text="This command must be sent as a reply to the "
            "message you want to save",
        )
    if message.text:
        save_to_db(message, context.bot.get_chat(message.chat_id), text=message.text)
        return reply(update, text="Saved message ✔")

    if message.new_chat_title:
        chat = context.bot.get_chat(message.chat_id)
        save_to_db(message, chat=chat)
        return reply(update, text="Saved title ✔")

    return reply(update, text="No text/title found to save.")


def handle_saved(update: Update, context: CallbackContext, **__) -> None:
    chat_id = update.effective_chat.id
    if (args := context.args) and args[0].lstrip("-").isnumeric():
        chat_id = int(args[0])
    return SavedMessagesInlines(chat_id).start(update, page=1)


def reply(update: Update, text: str, **kwargs):
    if not update.message:
        logger.error("Can't reply - no message to reply to: '%s'", update.to_dict())
        return

    default_kwargs = {
        "disable_notification": True,
        "disable_web_page_preview": True,
        "parse_mode": telegram.ParseMode.MARKDOWN,
        **kwargs,
    }
    try:
        update.message.reply_text(text, **default_kwargs)
    except telegram.error.TelegramError as e:
        if "can't find end of the entity" in str(e):
            location = int(e.message.split()[-1])
            logger.warning("Error parsing markdown - skipping '%s'", text[location])
            return reply(
                update, f"{text[:location]}\\{text[location]}{text[location + 1:]}"
            )
        logger.warning("Couldn't send markdown '%s'. (%s)", text, e)
        try:
            update.message.reply_text(text)
        except telegram.error.TelegramError as e:
            logger.exception("Error sending unformatted message. (%s)", e)
            update.message.reply_text("Got an error trying to send response")


def handle_start(update: Update, *_, **__):
    reply(
        update,
        f"Hi {update.effective_user.full_name}!",
        reply_markup=InlineKeyboardMarkup(
            [
                [
                    InlineKeyboardButton("Buses", callback_data="bus start"),
                    InlineKeyboardButton("Lights", callback_data="lights refresh"),
                    InlineKeyboardButton("Meals", callback_data="meals start"),
                ]
            ]
        ),
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


class Command(BaseCommand):
    @logfire.instrument("run_bot_polling")
    def handle(self, *_, **__):
        logger.info("Starting bot polling")
        config = environ.Env()
        if not (token := config("TELEGRAM_TOKEN")):
            raise GeminiError("Missing TELEGRAM_TOKEN")

        updater = Updater(token, use_context=True)
        dp = updater.dispatcher

        # Warning! make sure all handlers are wrapped in is_whitelisted!
        dp.add_handler(CommandHandler("bus", is_whitelisted(BusInline.start)))
        dp.add_handler(CommandHandler("chat_id", is_whitelisted(handle_chat_id)))
        dp.add_handler(CommandHandler("dex", is_whitelisted(handle_dex)))
        dp.add_handler(CommandHandler("earthquake", is_whitelisted(handle_earthquake)))
        dp.add_handler(CommandHandler("meals", is_whitelisted(MealsInline.start)))
        dp.add_handler(CommandHandler("next", is_whitelisted(handle_next)))
        dp.add_handler(CommandHandler("randomize", is_whitelisted(handle_randomize)))
        dp.add_handler(CommandHandler("reset", is_whitelisted(handle_reset)))
        dp.add_handler(CommandHandler("save", is_whitelisted(handle_save)))
        dp.add_handler(CommandHandler("saved", is_whitelisted(handle_saved)))
        dp.add_handler(CommandHandler("start", is_whitelisted(handle_start)))
        dp.add_handler(CallbackQueryHandler(is_whitelisted(handle_callback_query)))
        dp.add_handler(
            MessageHandler(
                (Filters.text & ~Filters.command)
                | Filters.photo
                | Filters.document.pdf,
                is_whitelisted(handle_process_message),
            )
        )
        dp.add_handler(
            MessageHandler(
                Filters.status_update.new_chat_title,
                is_whitelisted(handle_new_chat_title),
            )
        )
        dp.add_handler(
            MessageHandler(
                Filters.status_update.new_chat_members,
                is_whitelisted(handle_new_chat_members),
            )
        )
        dp.add_handler(
            MessageHandler(
                Filters.status_update.left_chat_member,
                is_whitelisted(handle_left_chat_member),
            )
        )
        updater.start_polling()
        updater.idle()
