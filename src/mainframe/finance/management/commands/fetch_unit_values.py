import json
from datetime import datetime

from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand, CommandError
from mainframe.clients import healthchecks
from mainframe.clients.logs import get_default_logger
from mainframe.clients.scraper import fetch
from mainframe.finance.models import Pension, UnitValue

logger = get_default_logger(__name__)


def extract_azt(response, pensions):
    soup = BeautifulSoup(response.content, "html.parser")
    rows = [r for r in soup.find_all("tr")[4:] if r.text.strip()]
    date_row = soup.find("td", text="Evolutie Fonduri de Pensii raportate la data de:")
    date = date_row.find_next_sibling("td").text.strip()
    unit_values = []
    for row in rows:
        fund_name, value, *_ = [
            td.text.strip() for td in row.find_all("td") if td.text.strip()
        ]
        if fund_name in pensions:
            unit_values.append(
                UnitValue(
                    pension=pensions[fund_name],
                    date=datetime.strptime(date, "%d-%m-%Y"),
                    value=value.replace(",", "."),
                )
            )

    return unit_values


def extracting(response, pensions):
    unit_values = []
    for fund in json.loads(response.json()):
        name = fund["name"]
        if "data" not in fund:
            logger.error("[Pension] missing data for '%s'", name)
            continue
        for unit in fund["data"]:
            unit_values.append(
                UnitValue(
                    pension=pensions[name],
                    date=datetime.fromtimestamp(int(unit[0] / 1000)),
                    value=unit[1],
                )
            )
    return unit_values


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--url", required=True, type=str)
        parser.add_argument("--payload", type=str)

    def handle(self, *_, **options):
        url = options["url"]
        payload = options["payload"]

        logger.info("[Pension] Fetching unit value from '%s'", url)
        healthchecks.ping(logger, "pension")

        resp, error = fetch(
            url,
            method="POST" if ":7777" not in url else "GET",
            logger=logger,
            timeout=15,
            soup=False,
            json=json.loads(payload) if ":7777" not in url else None,
        )
        if error:
            raise CommandError(error)

        pensions = {pension.name: pension for pension in Pension.objects.all()}
        if ":7777" not in url:
            unit_values = extracting(resp, pensions)
        else:
            unit_values = extract_azt(resp, pensions)

        UnitValue.objects.bulk_create(
            unit_values,
            update_conflicts=True,
            update_fields=["currency", "value"],
            unique_fields=["date", "pension"],
        )

        logger.info("[Pension] Done (%s records)", len(unit_values))
        self.stdout.write(self.style.SUCCESS("Done."))
