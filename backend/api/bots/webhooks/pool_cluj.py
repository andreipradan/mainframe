import logging

import environ
import requests.exceptions
import telegram

from api.bots.webhooks.shared import reply, validate_message
from bots.clients import mongo as database
from bots.clients.challonge import TournamentClient
from clients.logs import MainframeHandler

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


def get_stats_from_user(user):
    return {
        "id": user.id,
        "name": user.full_name,
        "username": user.username,
    }


def call(data, bot):
    available_commands = ["join", "leave", "score"]
    update = telegram.Update.de_json(data, bot.telegram_bot)
    message = update.message

    if not (command := validate_message(message, bot, custom_logger=logger)):
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
        return reply(
            update,
            f"Command not recognized: {command}\nAvailable: {sorted(available_commands)}",
        )

    command = command.replace(base_command, "").strip()

    tournament = TournamentClient(bot.token)

    if base_command == "clear":
        logger.info("Clearing participants")
        try:
            results = tournament.clear_participants()
        except requests.exceptions.HTTPError as e:
            logger.error(e)
            return reply(update, e.args[0])

        logger.warning(results["message"])
        return reply(update, results["message"])

    if base_command == "destroy":
        logger.warning("Destroying tournament")
        try:
            response = tournament.destroy()
        except requests.exceptions.HTTPError as e:
            error = f"[{tournament._id}] {e}"
            logger.error(error)
            return reply(update, error)
        msg = f"Destroyed {response['tournament']['url']}"
        logger.warning(msg)
        return reply(update, msg)

    if base_command == "join":
        logger.info("%s is trying to join", user_text)
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
                msg = "Not possible - tournament already started"
                logger.warning(msg)
                return reply(update, msg)
        except requests.exceptions.HTTPError as e:
            logger.exception(e)
            return reply(update, e.args[0])

        try:
            results = tournament.add_participants(id=user.id)
        except requests.exceptions.HTTPError as e:
            logger.warning(e)
            return reply(update, e.args[0])

        if results:
            logger.info("Added %s to the tournament", user_text)
            return reply(update, "You successfully joined the tournament! 🎉")
        logger.info("Couldn't add %s to the tournament", user_text)
        return reply(update, "Couldn't add you to the tournament")

    if base_command == "leave":
        logger.info("%s is trying to leave", user_text)
        if not tournament.get_player_by_telegram_id(user.id):
            logger.warning("Player %s not found in tournament", user_text)
            return reply(update, "You are not registered to this tournament")

        try:
            results = tournament.remove_participant(user.id)
        except requests.exceptions.HTTPError as e:
            logger.exception(e)
            return reply(update, e.args[0])

        msg = f"{results['participant']['name']} {'resigned' if tournament.is_started else 'left'}"
        logger.info(msg)
        return reply(update, msg)

    if base_command == "populate":
        logger.info("Populating participants")
        try:
            results = tournament.add_participants()
        except requests.exceptions.HTTPError as e:
            logger.error(e)
            return reply(update, e.args[0])

        if results:
            how_many = len(results)
            logger.info("Populated %d", how_many)
            return reply(
                update,
                f"{how_many} participant{'s' if how_many > 1 else ''} added: "
                f"{', '.join(r['participant']['name'] for r in results)}",
            )

        logger.warning("No participants added")
        return reply(update, "No participants were added")

    if base_command == "new":
        if command:
            try:
                kwargs = dict(kwargs.split("=") for kwargs in command.split(" "))
            except ValueError:
                error = (
                    "Invalid tournament parameters.\n"
                    "Format: /new [key]=[value] [key2]=[value2]\n"
                    "e.g. /new type=double_elimination"
                )
                logger.error(error)
                return reply(update, error)
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
            return reply(update, error)

        msg = (
            f"Created {tournament.data['game_name']} "
            f"tournament [{tournament.data['tournament_type']}]\n"
            f"{tournament.get_footer()}"
        )
        logger.info(msg)
        return reply(update, msg)

    if base_command == "score":
        logger.info("Set score: %s", command)
        if not tournament.is_started:
            logger.info("Tournament not started")
            return reply(update, "Not possible - tournament not started")

        try:
            response = tournament.update_score(user.id, command)
        except requests.exceptions.HTTPError as e:
            logger.exception(e)
            return reply(update, f"Couldn't update score: {e}")

        logger.info(response)
        return reply(update, response)

    if base_command == "start":
        logger.info("Starting tournament")
        try:
            if tournament.is_started:
                msg = "Tournament already started"
                logger.warning(msg)
                return reply(update, msg)
        except requests.exceptions.HTTPError as e:
            logger.exception(e)
            return reply(update, e.args[0])

        try:
            response = tournament.start()
        except requests.exceptions.HTTPError as e:
            logger.exception(e)
            return reply(update, e.args[0])

        logger.info("Tournament %s started.", response["tournament"]["url"])
        return reply(
            update,
            f"Started tournament 🎉\nGood Luck everyone!\n{tournament.get_footer()}",
        )

    return reply(update, f"Unrecognized command: {base_command} {command}")
