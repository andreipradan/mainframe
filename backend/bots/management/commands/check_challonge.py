import logging
from datetime import datetime
from pathlib import Path

import environ
import pytz
import requests
from django.core.management.base import BaseCommand

from bots.clients import mongo as database
from bots.clients.challonge import TournamentClient
# from core.settings import get_file_handler

logger = logging.getLogger(__name__)
# logger.addHandler(get_file_handler(Path(__file__).stem))


def check_open_matches(client):
    timezone = pytz.timezone("Europe/Bucharest")
    now = datetime.now().astimezone(timezone)
    if (now.weekday(), now.astimezone(timezone).strftime("%H:%M")) != (
        4,
        "15:30",
    ):
        return

    logger.info("Checking open matches")

    round_date_format = "%d %b %Y"
    deadline_reminder = {
        1: datetime.strptime("11 Nov 2022", round_date_format).date(),
        2: datetime.strptime("18 Nov 2022", round_date_format).date(),
        3: datetime.strptime("25 Nov 2022", round_date_format).date(),
        4: datetime.strptime("02 Dec 2022", round_date_format).date(),
        5: datetime.strptime("09 Dec 2022", round_date_format).date(),
        6: datetime.strptime("16 Dec 2022", round_date_format).date(),
        7: datetime.strptime("06 Jan 2023", round_date_format).date(),
        8: datetime.strptime("13 Jan 2023", round_date_format).date(),
        9: datetime.strptime("20 Jan 2023", round_date_format).date(),
        10: datetime.strptime("27 Jan 2023", round_date_format).date(),
        11: datetime.strptime("03 Feb 2023", round_date_format).date(),
    }

    open_matches = [
        m for m in client.open_matches if deadline_reminder[m["round"]] == now.date()
    ]
    if open_matches:
        matches = "\n".join(
            [f"{client.get_match_title(match['id'])}" for match in open_matches]
        )
        no_of_matches = len(open_matches)
        text = (
            f"<b>Salutare, {no_of_matches} meci{'uri' if no_of_matches > 1 else ''} "
            f"rămase pentru săptămâna aceasta:</b>"
            f"\n\n{matches}"
            f"\n\n{client.get_footer()}"
            "\n\nWeekend fain!"
        )
        client.send_message(text)
        logger.info(f"Found {no_of_matches} open matches")
    else:
        logger.info("No matches open")


class Command(BaseCommand):
    def handle(self, *args, **options):
        tournament = TournamentClient(environ.Env()("CHALLONGE_BOT_TOKEN"))
        try:
            if not tournament.is_started:
                return logger.info("Tournament not started. Skipping checks")
        except requests.exceptions.HTTPError:
            return ""

        check_open_matches(tournament)

        db_matches = {
            m["id"]: m for m in database.filter_by_ids(list(tournament.matches))
        }

        updates = []
        for _, match in tournament.matches.items():
            db_match = db_matches.get(match["id"])
            if db_match and match.items() <= db_match.items():
                continue
            db_match = db_match or {}
            updates.append(
                database.set_stats(
                    dict(match.items() - db_match.items()), False, id=match["id"]
                )
            )

        if updates:
            if db_matches:
                tournament.send_message(tournament.parse_updates(updates))
            else:
                logger.info("Initial matches setup. Skip sending update.")

            results = database.bulk_update(updates).bulk_api_result
            return logger.info(results)

        logger.info(f"No matches updates")

        self.stdout.write(self.style.SUCCESS("Done."))
