import asyncio
import csv
from datetime import datetime

import aiohttp
import logging
from typing import List

from clients import scraper
from transit_lines.models import TransitLine, Schedule

logger = logging.getLogger(__name__)


class FetchTransitLinesException(Exception):
    pass


def extract_line_type(class_list):
    if "tramvaie" in class_list:
        return TransitLine.TYPE_TRAM
    if "autobuze" in class_list:
        return TransitLine.TYPE_BUS
    if "troleibuze" in class_list:
        return TransitLine.TYPE_TROLLEYBUS
    if "microbuze" in class_list:
        return TransitLine.TYPE_MINIBUS


def extract_terminals(route, separators):
    if not separators:
        cj = "Cluj-Napoca"
        if cj in route:
            return cj, route.replace(cj, "").split("-")[1]
        raise FetchTransitLinesException(
            f"Couldn't extract terminals from route: {route}"
        )

    try:
        terminal1, terminal2 = route.split(separators.pop())
    except ValueError:
        return extract_terminals(route, separators)

    return terminal1, terminal2


async def fetch(session, sem, line, occ, url):
    async with sem:
        try:
            async with session.get(
                url, headers={"Referer": "https://ctpcj.ro/"}
            ) as response:
                if response.status != 200:
                    msg = f"Unexpected status for {url}. Status: {response.status}"
                    if response.status == 404:
                        logger.warning(msg)
                    else:
                        raise ValueError(msg)
                return await response.text(), line, occ, url
        except aiohttp.client_exceptions.ClientConnectorError as e:
            logger.error(e)
            return "", url


async def fetch_many(urls):
    sem = asyncio.Semaphore(1000)
    async with aiohttp.ClientSession() as session:
        return map(
            parse_schedule,
            await asyncio.gather(
                *[fetch(session, sem, line, occ, url) for (line, occ, url) in urls]
            ),
        )


def parse_schedule(args):
    response, line, occ, url = args
    if not response or "<title> 404 Not Found" in response:
        logger.warning(f"No or 404 in response for {url}")
        return

    rows = [row.strip() for row in response.split("\n")]
    date_row = rows[2].split(",")[1]
    schedule_start_date = datetime.strptime(date_row, "%d.%m.%Y") if date_row else None

    reader = csv.DictReader(rows[5:], fieldnames=["time1", "time2"])
    terminal1_schedule = []
    terminal2_schedule = []
    for row in reader:
        if time1 := row["time1"]:
            terminal1_schedule.append(time1)
        if time2 := row["time2"]:
            terminal2_schedule.append(time2)
    return Schedule(
        line=line,
        occurrence=occ,
        terminal1_schedule=terminal1_schedule,
        terminal2_schedule=terminal2_schedule,
        schedule_start_date=schedule_start_date,
    )


class CTPClient:
    DETAIL_URL = "https://ctpcj.ro/orare/csv/orar_{}_{}.csv"
    LIST_URL = "https://ctpcj.ro/index.php/ro/orare-linii/linii-{}"

    @classmethod
    def fetch_lines(cls, line_type, commit=True) -> List[TransitLine]:
        soup = scraper.fetch(cls.LIST_URL.format(f"{line_type}e"), logger)
        if isinstance(soup, Exception) or "EROARE" in soup.text:
            raise FetchTransitLinesException(soup)

        lines = []
        for item in soup.find_all("div", {"class": "element"}):
            name = (
                item.find("h6", {"itemprop": "name"})
                .text.strip()
                .replace("Linia ", "")
                .replace("Cora ", "")
            )
            route = item.find("div", {"class": "ruta"}).text.strip()
            terminal1, terminal2 = extract_terminals(route, [" - ", "-", "–"])
            transit_line = TransitLine(
                name=name,
                type=extract_line_type(item.attrs["class"]),
                terminal1=terminal1.strip(),
                terminal2=terminal2.strip(),
            )
            lines.append(transit_line)
        if commit:
            TransitLine.objects.bulk_create(
                lines,
                update_conflicts=True,
                update_fields=["type", "terminal1", "terminal2"],
                unique_fields=["name"],
            )
            logger.info(f"Stored {len(lines)} transit lines in db")
        return lines

    @classmethod
    def fetch_schedules(
        cls, lines: List[TransitLine] = None, occurrence=None, commit=True
    ):
        lines = lines or TransitLine.objects.all()
        schedules = []
        for line in lines:
            if occurrence:
                schedules.append(
                    (
                        line,
                        occurrence,
                        cls.DETAIL_URL.format(line.name.upper(), occurrence.lower()),
                    )
                )
            else:
                schedules.extend(
                    [
                        (line, occ, cls.DETAIL_URL.format(line.name.upper(), occ))
                        for occ in ["lv", "s", "d"]
                    ]
                )
        logger.info(
            f"Fetching {len(schedules)} schedules for {len(lines)} transit lines"
        )
        schedules = [s for s in asyncio.run(fetch_many(schedules)) if s]
        if commit:
            Schedule.objects.bulk_create(
                schedules,
                update_conflicts=True,
                update_fields=[
                    "terminal1_schedule",
                    "terminal2_schedule",
                    "schedule_start_date",
                ],
                unique_fields=Schedule._meta.unique_together,
            )
            logger.info(f"Stored {len(schedules)} schedules in db")
        return schedules
