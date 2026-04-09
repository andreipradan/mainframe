import hashlib
from datetime import datetime
from functools import cached_property
from typing import Dict, List
from zoneinfo import ZoneInfo

import structlog
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from pydantic import BaseModel

from mainframe.clients import healthchecks
from mainframe.clients.calendar import CalendarClient
from mainframe.clients.scraper import fetch

logger = structlog.get_logger(__name__)

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

    @property
    def id(self):
        hash_input = f"{self.county}-{self.start.isoformat()}-{self.external_id}"
        return hashlib.sha256(hash_input.encode()).hexdigest()

    @cached_property
    def location(self):
        return self.addresses[0]

    @classmethod
    def from_event(cls, event: dict, outage_type: str) -> "Outage":
        def clean_date(date_str: str) -> datetime:
            local_tz = ZoneInfo(settings.TIME_ZONE)
            naive_dt = datetime.strptime(date_str, "%d/%m/%Y %H:%M")
            local_dt = naive_dt.replace(tzinfo=local_tz)
            return local_dt.astimezone(ZoneInfo("UTC"))

        event = {k: v for k, v in event.items() if v}

        addresses = event.pop("adresa", None) or event.pop("ansambluFunctional")
        county = event.pop("judet", None) or event.pop("sucursala")
        duration = event.pop("durataProgramare", "")
        end = event.pop("dataStop", None) or event.pop("dataProgramareStop")
        external_id = event.pop("id")
        start = event.pop("dataStart", None) or event.pop("dataProgramareStart")

        return cls(
            additional_data=event,
            addresses=sorted(set(addresses.split("<br />"))),
            county=county.title(),
            duration=duration,
            end=clean_date(end),
            external_id=external_id,
            start=clean_date(start),
            type=outage_type,
        )

    def to_calendar_event(self) -> dict:
        def parse_description() -> str:
            locations = "\n".join(self.addresses)
            return (
                f"Affected locations:\n"
                f"{locations}\n"
                f"Headquarters: {self.county}\n"
                f"Type: {self.type}\n"
                f"Duration: {self.duration}\n"
                f"External ID: {self.external_id}\n"
            )

        def parse_summary() -> str:
            pre = "Outages" if len(self.addresses) > 1 else "Outage"
            loc = "locations" if len(self.addresses) > 1 else "location"
            return f"{pre} affecting {len(self.addresses)} {loc} in {self.county}"

        return {
            "id": self.id,
            "summary": parse_summary(),
            "location": self.addresses[0],
            "description": parse_description(),
            "start": {"dateTime": self.start.isoformat()},
            "end": {"dateTime": self.end.isoformat()},
            "extendedProperties": {
                "private": {"type": self.type, "branch": self.county}
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

        response, error = fetch(url, timeout=15, soup=False)
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

        bounded_logger = logger.bind(identifier=outage_type)
        bounded_logger.info(
            "Outages fetched",
            addresses=addresses,
            branch=branch.title(),
            counts={
                "county": len(county_outages),
                "filtered": len(outages),
                "all": len(all_outages),
            },
            type=outage_type,
        )

        client = CalendarClient(logger=bounded_logger)

        if outages:
            client.create_events(outages)
        else:
            client.clear_events(event_type=outage_type, branch=branch.title())

        healthchecks.ping("outages")
