import random

import environ
import telegram
from asgiref.sync import sync_to_async
from django.core.management import BaseCommand, CommandError
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
from mainframe.clients.storage import RedisClient
from mainframe.earthquakes.management.base_check import parse_event
from mainframe.earthquakes.models import Earthquake
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CallbackContext,
    CallbackQueryHandler,
    CommandHandler,
    MessageHandler,
    filters,
)

logger = get_default_logger(__name__)


def is_whitelisted(func):
    async def wrapper(update, context, *args, **kwargs):
        try:
            bot = await sync_to_async(Bot.objects.get)(
                username=context.bot.username,
                whitelist__contains=[
                    update.effective_user.username or update.effective_user.id
                ],
            )
        except Bot.DoesNotExist:
            logger.warning("Not whitelisted: %s", update.effective_user)
            return
        return await func(update, context, bot=bot, *args, **kwargs)  # noqa: B026

    return wrapper


redis_client = RedisClient(logger)


async def handle_callback_query(update: Update, *_, **__):
    query = update.callback_query
    await query.answer()

    cmd, *args = query.data.split()
    if cmd == "end":
        return await query.edit_message_text("See you next time!")

    if not args:
        return logger.error("No args for callback query data: %s", query.data)

    if cmd not in ["bus", "lights", "meals"]:
        saved_inline = SavedMessagesInlines(args.pop(0))
        if not (method := getattr(saved_inline, cmd, None)):
            return logger.error("Unhandled callback: %s", query.data)
        return await method(update, *args)

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
    return await getattr(inline, method)(update, *args, **kwargs)


async def handle_chat_id(update: Update, *_, **__):
    return await reply(update, f"Chat ID: {update.effective_chat.id}")


async def handle_dex(update, context: CallbackContext, **__):
    if len(context.args) != 1 or not (word := context.args[0]):
        await reply(
            update,
            "What do you want to search? (usage: '/dex <word>')",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    try:
        word, definition = dexonline.fetch_definition(word=word)
    except dexonline.DexOnlineNotFoundError:
        logger.warning("DexOnline - word not found: '%s'", word)
        return await reply(update, f"Couldn't find definition for '{word}'")
    except dexonline.DexOnlineError as e:
        logger.error(
            "DexOnlineError: '%s'. Update: '%s'. Context: '%s'",
            e,
            update.to_dict(),
            context,
        )
        return await reply(update, f"Couldn't find definition for '{word}'")
    return await reply(update, text=f"{word}: {definition}")


async def handle_earthquake(update, context: CallbackContext, bot, **__):
    config = bot.additional_data.get("earthquake")

    if not config:
        return await reply(update, text="No earthquake configuration found")

    @sync_to_async
    def fetch_latest():
        return Earthquake.objects.order_by("-timestamp").first()

    if not (latest := await fetch_latest()):
        return await reply(update, text="No earthquakes stored")

    args = context.args
    if len(args) == 2 and args[0] == "set_min_magnitude":  # noqa: PLR2004
        bot.additional_data["earthquake"]["min_magnitude"] = args[1]
        await sync_to_async(bot.save)()
        return await reply(update, text=f"Updated min magnitude to {args[1]}")

    msg = parse_event(latest)
    if last_check := config.get("last_check"):
        msg += f"\nLast check: {last_check}"
    return await reply(update, text=msg)


async def handle_left_chat_member(update: Update, *_, **__):
    return await reply(update, f"Bye {update.message.left_chat_member.full_name}! 😢")


async def handle_next(update: Update, *_, bot: Bot, **__):
    try:
        return await reply(update, whos_next(bot.additional_data.get("whos_next")))
    except CommandError as e:
        return await reply(update, str(e))


async def handle_new_chat_members(update: Update, *_, **__):
    new_members = [u.full_name for u in update.message.new_chat_members]
    return await reply(update, f"Welcome {', '.join(new_members)}!")


async def handle_new_chat_title(
    update: Update, context: CallbackContext, bot: Bot
) -> None:
    chat_id = update.effective_chat.id
    if bot.additional_data.get("whos_next", {}).get("chat_id") != chat_id:
        logger.info("[%s] New chat title: %s", chat_id, update.effective_chat.title)
        return

    config = bot.additional_data["whos_next"]
    await save_to_db(update.message, chat=await context.bot.get_chat(chat_id))
    config["posted"] = True
    config["initial"] = False

    @sync_to_async
    def save():
        bot.save()

    await save()
    return await reply(update, text="Saved ✔")


async def handle_process_message(
    update: Update, context: CallbackContext, *_, **__
) -> None:
    if not (message := update.message):
        return logger.error("No message in '%s'", update.to_dict())

    text = getattr(message, "text", "") or message.caption or ""
    if not (context.bot.username in text or update.effective_chat.type == "private"):
        return logger.info("No tag or caption")

    if not redis_client.ping():
        logger.error("Can't connect to redis")
        return

    context_key = f"context:{update.effective_chat.id}"
    if not (history := redis_client.get(context_key)):
        history = [{"role": "user", "parts": "You can use emojis"}]

    file_path = None
    if update.message.photo:
        file_path = (await update.message.photo[-1].get_file()).download_to_drive()
        # TODO: set uploaded docs (name from genai.upload_file) in redis -
        #  clear them on handle_clear
    elif doc := update.message.document:
        file_path = (await doc.get_file()).download_to_drive()

    history.append(
        {
            "role": "user",
            "parts": f"User: {update.effective_user.full_name}. Text: {text}",
        }
    )
    try:
        response = generate_content(prompt=text, history=history, file_path=file_path)
    except GeminiError as e:
        logger.exception(e)
        await reply(update, "Got an error trying to process your message")
    else:
        history.append({"role": "model", "parts": response})
        redis_client.set(context_key, history)

        await reply(
            update,
            response.replace("**", "").replace("*", "\*"),
            parse_mode=ParseMode.HTML,
        )


async def handle_randomize(update: Update, context: CallbackContext, **__) -> None:
    if len(args := context.args) not in range(2, 51):
        return await reply(update, "Must contain 2-50 items separated by spaces")
    random.shuffle(args)
    return await reply(
        update, "\n".join(f"{i + 1}. {item}" for i, item in enumerate(args))
    )


async def handle_reset(update: Update, *_, **__) -> None:
    storage_key = f"context:{update.effective_chat.id}:{update.effective_user.id}"
    redis_client.delete(storage_key)
    await reply(update, "My memory was erased! Who are you? 😄")


async def handle_save(update: Update, context: CallbackContext, **__) -> None:
    message = update.message.reply_to_message
    if not message:
        return await reply(
            update,
            text="This command must be sent as a reply to the "
            "message you want to save",
        )
    if message.text:
        await save_to_db(
            message, await context.bot.get_chat(message.chat_id), text=message.text
        )
        return await reply(update, text="Saved message ✔")

    if message.new_chat_title:
        chat = await context.bot.get_chat(message.chat_id)
        await save_to_db(message, chat=chat)
        return await reply(update, text="Saved title ✔")

    return await reply(update, text="No text/title found to save.")


async def handle_saved(update: Update, context: CallbackContext, **__):
    chat_id = update.effective_chat.id
    if (args := context.args) and args[0].lstrip("-").isnumeric():
        chat_id = int(args[0])
    return await SavedMessagesInlines(chat_id).start(update, page=1)


async def reply(update: Update, text: str, **kwargs):
    if not update.message:
        logger.error("Can't reply - no message to reply to: '%s'", update.to_dict())
        return

    default_kwargs = {
        "disable_notification": True,
        "disable_web_page_preview": True,
        "parse_mode": ParseMode.HTML,
        **kwargs,
    }
    try:
        await update.message.reply_text(text, **default_kwargs)
    except telegram.error.TelegramError as e:
        if "can't find end of the entity" in str(e):
            location = int(e.message.split()[-1])
            logger.warning("Error parsing markdown - skipping '%s'", text[location])
            return reply(
                update, f"{text[:location]}\\{text[location]}{text[location + 1:]}"
            )
        logger.warning("Couldn't send markdown '%s'. (%s)", text, e)
        try:
            await update.message.reply_text(text)
        except telegram.error.TelegramError as e:
            logger.exception("Error sending unformatted message. (%s)", e)
            await update.message.reply_text("Got an error trying to send response")


async def handle_start(update: Update, *_, **__):
    await reply(
        update,
        f"Hi {update.effective_user.full_name}!",
        reply_markup=InlineKeyboardMarkup(
            [
                [
                    InlineKeyboardButton("Buses", callback_data="bus start"),
                    InlineKeyboardButton("Lights", callback_data="lights refresh"),
                    InlineKeyboardButton("Meals", callback_data="meals start"),
                    InlineKeyboardButton(
                        "Saved", callback_data=f"start {update.effective_chat.id} 1"
                    ),
                    InlineKeyboardButton("✅", callback_data="end"),
                ]
            ]
        ),
    )


async def save_to_db(message, chat, text=None):
    author = message.from_user.to_dict()
    author["full_name"] = message.from_user.full_name
    text = text or chat.description
    title = (
        message.chat.title
        or f"{chat.bot.first_name if chat.type == 'private' else chat.id} ({chat.type})"
    )
    await sync_to_async(Message.objects.create)(
        author=author,
        chat_id=message.chat_id,
        chat_title=title,
        date=message.date,
        message_id=message.message_id,
        saved_by=message.from_user.to_dict(),
        text=text,
    )


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger.info("Starting bot polling")
        config = environ.Env()
        if not (token := config("TELEGRAM_TOKEN")):
            logger.error("Telegram token not found")
            return

        app = Application.builder().token(token).build()

        # Warning! make sure all handlers are wrapped in is_whitelisted!
        app.add_handler(CommandHandler("bus", is_whitelisted(BusInline.start)))
        app.add_handler(CommandHandler("chat_id", is_whitelisted(handle_chat_id)))
        app.add_handler(CommandHandler("dex", is_whitelisted(handle_dex)))
        app.add_handler(CommandHandler("earthquake", is_whitelisted(handle_earthquake)))
        app.add_handler(CommandHandler("meals", is_whitelisted(MealsInline.start)))
        app.add_handler(CommandHandler("next", is_whitelisted(handle_next)))
        app.add_handler(CommandHandler("randomize", is_whitelisted(handle_randomize)))
        app.add_handler(CommandHandler("reset", is_whitelisted(handle_reset)))
        app.add_handler(CommandHandler("save", is_whitelisted(handle_save)))
        app.add_handler(CommandHandler("saved", is_whitelisted(handle_saved)))
        app.add_handler(CommandHandler("start", is_whitelisted(handle_start)))
        app.add_handler(CallbackQueryHandler(is_whitelisted(handle_callback_query)))
        app.add_handler(
            MessageHandler(
                (filters.TEXT & ~filters.COMMAND)
                | filters.PHOTO
                | filters.Document.PDF,
                is_whitelisted(handle_process_message),
            )
        )
        app.add_handler(
            MessageHandler(
                filters.StatusUpdate.NEW_CHAT_TITLE,
                is_whitelisted(handle_new_chat_title),
            )
        )
        app.add_handler(
            MessageHandler(
                filters.StatusUpdate.NEW_CHAT_MEMBERS,
                is_whitelisted(handle_new_chat_members),
            )
        )
        app.add_handler(
            MessageHandler(
                filters.StatusUpdate.LEFT_CHAT_MEMBER,
                is_whitelisted(handle_left_chat_member),
            )
        )
        app.run_polling(allowed_updates=Update.ALL_TYPES)
