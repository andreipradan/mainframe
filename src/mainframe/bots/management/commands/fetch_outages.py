import hashlib
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

TYPE_ACCIDENTAL = "Accidental"
TYPE_PLANNED_15_DAYS = "Planned (15 days)"
TYPE_PLANNED_TODAY = "Planned (today)"


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
            county=county.title(),
            duration=duration,
            end=clean_date(end),
            external_id=external_id,
            start=clean_date(start),
            type=outage_type,
        )

    def to_calendar_event(self, addresses_query) -> dict:
        def generate_id() -> str:
            hash_input = f"{self.county}-{self.start.isoformat()}-{self.external_id}"
            return hashlib.sha256(hash_input.encode()).hexdigest()

        def parse_description() -> str:
            return (
                f"<b>Affected locations<b/>"
                f"<ul>{''.join(f'<li>{add}</li>' for add in self.addresses)}</ul>"
                f"<i>Headquarters: {self.county}<br />"
                f"Type: {self.type}<br />"
                f"Duration: {self.duration}<br />"
                f"External ID: {self.external_id}<br />"
            )

        def parse_summary() -> str:
            pre = "Outages" if len(self.addresses) > 1 else "Outage"
            loc = "locations" if len(self.addresses) > 1 else "location"
            return f"{pre} affecting {len(self.addresses)} {loc} in {self.county}"

        return {
            "id": generate_id(),
            "summary": parse_summary(),
            "location": self.addresses[0],
            "description": parse_description(),
            "start": {"dateTime": self.start.isoformat()},
            "end": {"dateTime": self.end.isoformat()},
            "extendedProperties": {
                "private": {
                    "type": self.type,
                    "branch": self.county,
                    "addresses": addresses_query,
                }
            },
        }


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--addresses", nargs="+", default=[], type=str)
        parser.add_argument("--branch", required=True, type=str)
        parser.add_argument("--url", required=True, type=str)

    def handle(self, *_, **options):
        branch = options["branch"]
        addresses = options["addresses"]
        url = options["url"]

        if url.endswith("/0"):
            outage_type = TYPE_ACCIDENTAL
        elif url.endswith("/0/15"):
            outage_type = TYPE_PLANNED_15_DAYS
        elif url.endswith("/0/azi"):
            outage_type = TYPE_PLANNED_TODAY
        else:
            raise CommandError("Invalid outage type in URL")

        prefix = f"[Outages][{branch.title()}][{outage_type}]"

        response, error = fetch(
            url, logger=logger, prefix=prefix, timeout=15, soup=False
        )
        if error:
            raise CommandError(error)

        data = response.json()
        all_outages = [Outage.from_event(event, outage_type) for event in data]
        county_outages = [o for o in all_outages if o.county.lower() == branch.lower()]
        outages = (
            county_outages[:]
            if not addresses
            else [
                outage
                for outage in county_outages
                if any(
                    all(term in addr.lower() for term in street.split("&"))
                    for street in addresses
                    for addr in outage.addresses
                )
            ]
        )

        logger.info(
            "%s %s event(s)%s (Total: %s, %s: %s)",
            prefix,
            len(outages) or "No",
            f" on '{', '.join(addresses)}'" if addresses else "",
            len(data),
            branch.title(),
            len(county_outages),
        )

        client = CalendarClient(logger=logger, prefix=prefix)
        client.clear_events(
            event_type=outage_type, branch=branch.title(), addresses=addresses
        )

        if not outages:
            logger.info("%s No events to process", prefix)
            healthchecks.ping(logger, "outages")
            return

        client.create_events([event.to_calendar_event(addresses) for event in outages])
        logger.info("%s Done", prefix)
        healthchecks.ping(logger, "outages")
