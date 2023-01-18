import logging
import re
from datetime import datetime

import environ
import pytz
import requests
import telegram

from bots.clients import mongo as database

logger = logging.getLogger(__name__)

TIME_ZONE = "Europe/Bucharest"

config = environ.Env()


def convert_to_timezone(datetime_string, tz="UTC"):
    if datetime_string:
        datetime_string = datetime_string.replace("Z", "+00:00")
        dt = datetime.fromisoformat(datetime_string).astimezone(pytz.timezone(tz))
        if tz == "UTC":
            return dt.isoformat()
        return dt.strftime("%Y-%m-%d %H:%M")


class TournamentClient:
    BASE_URL = "https://api.challonge.com/v1/tournaments"
    TOURNAMENT_NAME = config("CHALLONGE_DATABASE_NAME").replace("-", "")
    _id = re.sub(r"\W+", "", TOURNAMENT_NAME).lower()
    excluded_fields = ("loser_id",)

    def __init__(self, token, data=None):
        self._data = data
        self.token = token
        self.url = f"{self.BASE_URL}/{self._id}"

    def send_message(self, text):
        chat_id = config("CHALLONGE_CHAT_ID")
        try:
            logger.info(f"Sending {text} to {chat_id}")
            return telegram.Bot(self.token).send_message(
                chat_id=chat_id,
                disable_notification=True,
                disable_web_page_preview=True,
                parse_mode=telegram.ParseMode.HTML,
                text=text,
            )
        except telegram.error.BadRequest as e:
            logger.exception(f"Error sending telegram message: {e}")

    @classmethod
    def _request(cls, url, method="GET", data=None):
        logger.info(f"[{method.upper()}] - {url}")

        basic = requests.auth.HTTPBasicAuth(
            config("CHALLONGE_USERNAME"), config("CHALLONGE_API_KEY")
        )
        response = requests.request(
            method=method,
            url=url,
            headers={"User-Agent": "Mozilla/5.0"},
            auth=basic,
            data=data,
        )
        if 200 <= response.status_code < 300:
            logger.info(f"Got: {response.status_code} {response.reason}")
            return response.json()

        try:
            error = ", ".join(response.json()["errors"])
        except requests.exceptions.JSONDecodeError:
            error = response.reason

        logger.exception(f"[{cls._id}] [{response.status_code}] Error: {error}")
        raise requests.exceptions.HTTPError(f"[{response.status_code}] {error}")

    @classmethod
    def create(cls, token, **params):
        params["game_name"] = params.get("game_name", "8-ball")
        params["name"] = params.get("name", cls.TOURNAMENT_NAME)
        params["tournament_type"] = params.pop("type", "round robin")
        params["url"] = params.get("url", cls._id)

        data = cls._request(
            url=f"{cls.BASE_URL}.json",
            method="POST",
            data={f"tournament[{key}]": value for key, value in params.items()},
        )["tournament"]
        return cls(token=token, data=data)

    @property
    def data(self):
        return self._data or self.fetch()._data

    @property
    def is_started(self):
        return self.data["state"] == "underway"

    @property
    def matches(self):
        return self._get_related("match")

    @property
    def open_matches(self):
        return [m for _, m in self.matches.items() if m["state"] == "open"]

    @property
    def participants(self):
        return self._get_related("participant")

    @property
    def participants_by_name(self):
        return self._get_related("participant", by="name")

    def _adjust_dates(self, obj):
        for k, v in obj.items():
            if k.endswith("_at") or k.endswith("_time"):
                obj[k] = convert_to_timezone(obj[k])
        return obj

    def _get_related(self, field, by="id"):
        suffix = "s" if field == "participant" else "es"
        return {
            m[field][by]: self._adjust_dates(m[field])
            for m in self.data[f"{field}{suffix}"]
        }

    def add_participants(self, **kwargs):
        data = [
            (f"participants[][{key if key != 'id' else 'misc'}]", value)
            for sublist in database.get_many("participants", **kwargs)
            for key, value in sorted(sublist.items())
            if key != "_id"
        ]
        return self._request(
            method="POST",
            url=f"{self.url}/participants/bulk_add.json",
            data=data,
        )

    def clear_participants(self):
        return self._request(method="DELETE", url=f"{self.url}/participants/clear.json")

    def destroy(self):
        logger.warning(f"Destroying tournament {self._id}")
        response = self._request(f"{self.url}.json", method="DELETE")
        database.get_collection().drop()
        logger.warning("Dropped matches collection")
        return response

    def fetch(self):
        params = "include_matches=1&include_participants=1"
        url = f"{self.url}.json?{params}"
        self._data = self._request(url)["tournament"]
        return self

    def get_footer(self):
        return f"<a href='https://challonge.com/{self._id}'>" f"Tournament page" f"</a>"

    def get_player_by_telegram_id(self, telegram_id):
        for _id, player in self.participants.items():
            if player["misc"] == str(telegram_id):
                return player

    def get_player_open_match(self, player_id):
        open_matches = [
            m
            for m in self.open_matches
            if player_id in [m["player1_id"], m["player2_id"]]
        ]
        return open_matches[0] if open_matches else None

    def get_player_name(self, player_id):
        return self.participants[player_id]["name"] if player_id else "?"

    def get_match_title(self, match_id):
        match_data = self.matches[match_id]
        player1 = self.get_player_name(match_data["player1_id"])
        player2 = self.get_player_name(match_data["player2_id"])
        return f"{player1} vs {player2} [Round {self.matches[match_id]['round']}]"

    def get_update_verbose(self, update_field, update_value):
        field_verbose = update_field.replace("_", " ").capitalize()
        if not update_value:
            return f"Cleared: {field_verbose}"
        if update_field == "scores_csv":
            return f"Score: {update_value.replace('-', ':')}"
        if update_field in [
            "underway_at",
            "started_at",
            "completed_at",
            "started_at",
            "scheduled_time",
        ]:
            verbose = convert_to_timezone(update_value, TIME_ZONE)
            return f"{field_verbose}: {verbose}"
        if update_field in ["loser_id", "winner_id", "player1_id", "player2_id"]:
            field = update_field.split("_")[0].title()
            emoji = "💪" if update_field == "winner_id" else ""
            return f"{field}: {self.get_player_name(update_value)}{emoji}"
        return f"{update_field.title()}: {update_value}"

    def parse_update(self, update):
        match_id = update._filter["id"]
        match_updates = {
            k: v for k, v in update._doc["$set"].items() if k != "updated_at"
        }
        match_updates = [
            f" {self.get_update_verbose(*item)}"
            for item in match_updates.items()
            if item not in self.excluded_fields
        ]
        match_updates = "\n".join(sorted(match_updates))
        return f"<b>{self.get_match_title(match_id)}</b>\n{match_updates}"

    def parse_updates(self, items):
        items = "\n\n".join([self.parse_update(u) for u in items])
        return f"{items}" f"\n\n{self.get_footer()}"

    def remove_participant(self, telegram_id):
        participant_id = self.get_player_by_telegram_id(telegram_id)["id"]
        return self._request(
            url=f"{self.url}/participants/{participant_id}.json", method="DELETE"
        )

    def start(self):
        return self._request(url=f"{self.url}/start.json", method="POST")

    def update_score(self, player_id, score):
        data = {"match[scores_csv]": score}
        scores = score.split("-")
        if len(scores) != 2 or not all((s.isdigit() for s in scores)):
            return (
                f'Invalid score: "{score}"\n'
                f"Format: /score [score1]-[score2]\n"
                f"e.g. /score 1-2"
            )

        footer = self.get_footer()
        player = self.get_player_by_telegram_id(player_id)
        if not player:
            return f"You were not found in participants list.\n{footer}"

        player_match = self.get_player_open_match(player["id"])
        if not player_match:
            return f"You do not have an open match.\n{footer}"

        match_id = player_match["id"]
        if player_match["scores_csv"] == score:
            return f"No changes. Pre-existing score ({score})"

        if "3" in scores:
            data["match[winner_id]"] = (
                self.matches[match_id]["player1_id"]
                if scores[0] == "3"
                else self.matches[match_id]["player2_id"]
            )

        self._request(
            url=f"{self.url}/matches/{match_id}.json",
            method="PUT",
            data=data,
        )
        return f"Updated {self.get_match_title(match_id)} score to {score} 👍\n{footer}"
