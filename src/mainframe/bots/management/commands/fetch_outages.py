import logging
from datetime import datetime
from typing import Dict, List

import pytz
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from pydantic import BaseModel

from mainframe.clients import healthchecks
from mainframe.clients.calendar import CalendarClient
from mainframe.clients.scraper import fetch

logger = logging.getLogger(__name__)


class Outage(BaseModel):
    additional_data: Dict = {}
    addresses: List[str] = []
    county: str
    duration: str = ""
    end: datetime
    external_id: int
    start: datetime
    type: str

    @classmethod
    def from_event(cls, event: dict, outage_type: str) -> "Outage":
        def clean_date(date_str: str) -> datetime:
            local_tz = pytz.timezone(settings.TIME_ZONE)
            naive_dt = datetime.strptime(date_str, "%d/%m/%Y %H:%M")
            local_dt = local_tz.localize(naive_dt)
            return local_dt.astimezone(pytz.utc)

        event = {k: v for k, v in event.items() if v}

        addresses = event.pop("adresa", None) or event.pop("ansambluFunctional")
        county = event.pop("judet", None) or event.pop("sucursala")
        duration = event.pop("durataProgramare", "")
        end = event.pop("dataStop", None) or event.pop("dataProgramareStop")
        external_id = event.pop("id")
        start = event.pop("dataStart", None) or event.pop("dataProgramareStart")

        return cls(
            additional_data=event,
            addresses=list(set(addresses.split("<br />"))),
            county=county,
            duration=duration,
            end=clean_date(end),
            external_id=external_id,
            start=clean_date(start),
            type=outage_type,
        )


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--county", required=True, type=str)
        parser.add_argument("--url", required=True, type=str)
        parser.add_argument("--streets", nargs="+", required=True, type=str)

    def handle(self, *_, **options):
        county = options["county"]
        streets = options["streets"]
        url = options["url"]

        if url.endswith("/0"):
            outage_type = "Accidental"
        elif url.endswith("/0/15"):
            outage_type = "Planned (15 days)"
        elif url.endswith("/0/azi"):
            outage_type = "Planned (today)"
        else:
            raise CommandError("Invalid outage type in URL")

        logger.info("[Outages] Fetching '%s' outages", outage_type)

        response, error = fetch(url, logger=logger, timeout=15, soup=False)
        if error:
            raise CommandError(error)

        data = response.json()
        all_outages = [Outage.from_event(event, outage_type) for event in data]
        county_outages = [o for o in all_outages if o.county.lower() == county.lower()]
        filtered_outages = [
            outage
            for outage in county_outages
            if any(
                any(street in addr.lower() for street in streets)
                for addr in outage.addresses
            )
        ]

        logger.info(
            "[Outages] Found '%s' events in '%s' on streets: %s "
            "(from a total of '%s', '%s' in county)",
            len(filtered_outages),
            county,
            ", ".join(streets),
            len(data),
            len(county_outages),
        )

        if filtered_outages:

            def parse_title(event: Outage) -> str:
                first, *other = event.addresses
                prefix = f"{event.duration} " if event.duration else ""
                if not other:
                    return f"{prefix}Outage on {first}"
                return f"{prefix}Outage on {first} + {len(event.addresses) - 1} others"

            client = CalendarClient()
            client.clear_all()
            client.create_events(
                [
                    {
                        "summary": parse_title(event),
                        "description": "Addresses affected:\n"
                        + "\n".join(event.addresses),
                        "start": {"dateTime": event.start.isoformat()},
                        "end": {"dateTime": event.end.isoformat()},
                    }
                    for event in filtered_outages
                ]
            )
            logger.info("[Outages] Created %d calendar events", len(filtered_outages))
        else:
            logger.info("[Outages] No calendar events created")
        logger.info("[Outages] Done")
        healthchecks.ping(logger, "outages")
