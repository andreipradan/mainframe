import logging

import environ
import requests.exceptions
import six
import telegram

from bots.clients import mongo as database
from bots.clients.challonge import TournamentClient

logger = logging.getLogger(__name__)


def get_stats_from_user(user):
    return {
        "id": user.id,
        "name": user.full_name,
        "username": user.username,
    }


def validate_message(message, bot):
    if not message:
        logger.warning(f"No message")
        return ""

    text = message.text
    if not text:
        logger.warning("No message text")
        return ""

    user = message.from_user
    if user.is_bot:
        logger.warning(
            f"Ignoring message from bot({user.username}): "
            f"{getattr(message, 'text', 'Got no text')}"
        )
        return ""

    if not message.chat_id:
        logger.warning(f"No chat_id in message keys: {list(message)}")
        return ""

    if str(message.chat_id) not in bot.whitelist:
        logger.warning("Chat not in whitelist")
        return ""

    text = text.strip()
    if isinstance(text, six.binary_type):
        text = text.decode("utf-8")

    if len(text) < 1 or not text.startswith("/"):
        logger.info("Not a command")
        return ""

    return text[1:]


def reply(update, text):
    try:
        update.message.reply_text(
            text[:1000] + "" if len(text) <= 1000 else "[truncated]",
            disable_notification=True,
            disable_web_page_preview=True,
            parse_mode=telegram.ParseMode.HTML,
        )
    except telegram.error.BadRequest as e:
        logger.exception(e)
        return ""


def call(data, bot):
    available_commands = ["join", "leave", "score"]
    update = telegram.Update.de_json(data, telegram.Bot(bot.token))
    message = update.message

    if not (command := validate_message(message, bot)):
        new_chat_members = getattr(message, "new_chat_members", None)
        if new_chat_members:
            logger.info(
                f"New chat members: {', '.join(m.full_name for m in new_chat_members)}"
            )
            updates = [
                database.set_stats(
                    stats=get_stats_from_user(m),
                    commit=False,
                    id=m.id,
                )
                for m in new_chat_members
                if not m.is_bot
            ]
            if updates:
                database.bulk_update(updates, collection="participants")
            elif all((m.is_bot for m in new_chat_members)):
                logger.info("Only bots joined")
            else:
                logger.info("Users that joined already in the database")
        return ""

    user = message.from_user
    user_text = f"{user.full_name} ({user.id})"
    if user.id == environ.Env()("CHALLONGE_USERNAME"):
        available_commands += ["clear", "destroy", "new", "populate", "start"]

    base_command = command.split(" ")[0]
    if base_command not in available_commands:
        reply(
            update,
            f"Command not recognized: {command}\nAvailable: {sorted(available_commands)}",
        )
        return ""

    command = command.replace(base_command, "").strip()

    tournament = TournamentClient(bot.token)

    if base_command == "clear":
        logger.info("Clearing participants")
        try:
            results = tournament.clear_participants()
        except requests.exceptions.HTTPError as e:
            logger.error(e)
            reply(update, e.args[0])
            return ""

        logger.warning(results["message"])
        reply(update, results["message"])
        return ""

    if base_command == "destroy":
        logger.warning("Destroying tournament")
        try:
            response = tournament.destroy()
        except requests.exceptions.HTTPError as e:
            error = f"[{tournament._id}] {e}"
            logger.error(error)
            reply(update, error)
            return ""
        msg = f"Destroyed {response['tournament']['url']}"
        logger.warning(msg)
        reply(update, msg)
        return ""

    if base_command == "join":
        logger.info(f"{user_text} is trying to join")
        db_results = database.set_stats(
            get_stats_from_user(user),
            collection="participants",
            id=user.id,
        )
        logger.info(
            " | ".join(
                f"{key}: {getattr(db_results, key, None)}"
                for key in ["upserted_id", "modified_count", "matched_count"]
            )
        )

        try:
            if tournament.is_started:
                msg = f"Not possible - tournament already started"
                logger.warning(msg)
                reply(update, msg)
                return ""
        except requests.exceptions.HTTPError as e:
            logger.exception(e)
            reply(update, e.args[0])
            return ""

        try:
            results = tournament.add_participants(id=user.id)
        except requests.exceptions.HTTPError as e:
            logger.warning(e)
            reply(update, e.args[0])
            return ""

        if results:
            logger.info(f"Added {user_text} to the tournament")
            reply(update, "You successfully joined the tournament! 🎉")
            return ""
        logger.info(f"Couldn't add {user_text} to the tournament")
        reply(update, "Couldn't add you to the tournament")
        return ""

    if base_command == "leave":
        logger.info(f"{user_text} is trying to leave")
        if not tournament.get_player_by_telegram_id(user.id):
            logger.warning(f"Player {user_text} not found in tournament")
            reply(update, "You are not registered to this tournament")
            return ""

        try:
            results = tournament.remove_participant(user.id)
        except requests.exceptions.HTTPError as e:
            logger.exception(e)
            reply(update, e.args[0])
            return ""

        msg = f"{results['participant']['name']} {'resigned' if tournament.is_started else 'left'}"
        logger.info(msg)
        reply(update, msg)
        return ""

    if base_command == "populate":
        logger.info("Populating participants")
        try:
            results = tournament.add_participants()
        except requests.exceptions.HTTPError as e:
            logger.error(e)
            reply(update, e.args[0])
            return ""

        if results:
            how_many = len(results)
            logger.info(f"Populated {how_many}")
            reply(
                update,
                f"{how_many} participant{'s' if how_many > 1 else ''} added: "
                f"{', '.join(r['participant']['name'] for r in results)}",
            )
            return ""

        logger.warning("No participants added")
        reply(update, "No participants were added")
        return ""

    if base_command == "new":
        if command:
            try:
                kwargs = dict(kwargs.split("=") for kwargs in command.split(" "))
            except ValueError:
                error = (
                    "Invalid tournament parameters.\n"
                    f"Format: /new [key]=[value] [key2]=[value2]\n"
                    f"e.g. /new type=double_elimination"
                )
                logger.error(error)
                reply(update, error)
                return ""
        else:
            kwargs = {}

        for k, v in kwargs.items():
            kwargs[k] = v.replace("_", " ").lower()

        logger.info("Creating new tournament")
        try:
            tournament = TournamentClient.create(bot.token, **kwargs)
        except requests.exceptions.HTTPError as e:
            kwargs_pretty = "\n".join([f"{k}={v}" for k, v in kwargs.items()])
            error = f"Couldn't create tournament\n{kwargs_pretty}\n{e}"
            logger.exception(error)
            reply(update, error)
            return ""

        msg = (
            f"Created {tournament.data['game_name']} "
            f"tournament [{tournament.data['tournament_type']}]\n"
            f"{tournament.get_footer()}"
        )
        logger.info(msg)
        reply(update, msg)
        return ""

    if base_command == "score":
        logger.info(f"Set score: {command}")
        if not tournament.is_started:
            logger.info("Tournament not started")
            reply(update, "Not possible - tournament not started")
            return ""

        try:
            response = tournament.update_score(user.id, command)
        except requests.exceptions.HTTPError as e:
            logger.exception(e)
            reply(update, f"Couldn't update score: {e}")
            return ""

        logger.info(response)
        reply(update, response)
        return ""

    if base_command == "start":
        logger.info("Starting tournament")
        try:
            if tournament.is_started:
                msg = "Tournament already started"
                logger.warning(msg)
                reply(update, msg)
                return ""
        except requests.exceptions.HTTPError as e:
            logger.exception(e)
            reply(update, e.args[0])
            return ""

        try:
            response = tournament.start()
        except requests.exceptions.HTTPError as e:
            logger.exception(e)
            reply(update, e.args[0])
            return ""

        logger.info(f"Tournament {response['tournament']['url']} started.")
        reply(
            update,
            f"Started tournament 🎉\nGood Luck everyone!\n{tournament.get_footer()}",
        )
        return ""

    reply(update, f"Unrecognized command: {base_command} {command}")
    return ""
