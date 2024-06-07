import asyncio
import csv
import re
from datetime import datetime
from typing import List, Optional

import aiohttp
from mainframe.clients import scraper
from mainframe.transit_lines.models import Schedule, TransitLine
from rest_framework import status


class FetchTransitLinesException(Exception):
    pass


def extract_line_type(class_list):
    if "trams" in class_list:
        return TransitLine.CAR_TYPE_TRAM
    if "trolleybus" in class_list or "trolleybuses" in class_list:
        return TransitLine.CAR_TYPE_TROLLEYBUS
    if "minibuses" in class_list:
        return TransitLine.CAR_TYPE_MINIBUS
    return TransitLine.CAR_TYPE_BUS


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


class CTPClient:
    DETAIL_URL = "https://ctpcj.ro/orare/csv/orar_{}_{}.csv"
    LIST_URL = "https://ctpcj.ro/index.php/en/timetables/{}"

    def __init__(self, logger):
        self.logger = logger

    def fetch_lines(self, line_type, commit=True) -> List[TransitLine]:
        choices = [c[0] for c in TransitLine.LINE_TYPE_CHOICES]
        if line_type not in choices:
            raise FetchTransitLinesException(
                f"Invalid line_type: {line_type}. Must be one of {choices}"
            )
        url = self.LIST_URL.format(
            f"{line_type}-line"
            f"{'s' if line_type != TransitLine.LINE_TYPE_EXPRESS else ''}"
        )
        soup = scraper.fetch(url, self.logger)
        if isinstance(soup, Exception) or "EROARE" in soup.text:
            raise FetchTransitLinesException(soup)

        lines = []
        for item in soup.find_all(
            "div", {"class": "element", "data-title": re.compile("Line")}
        ):
            name = (
                item.find("h6", {"itemprop": "name"})
                .text.strip()
                .replace("Line ", "")
                .replace(" Line", "")
                .replace("Cora ", "")
            )
            route = item.find("div", {"class": "ruta"}).text.strip()
            terminal1, terminal2 = extract_terminals(route, [" - ", "-", "–"])
            transit_line = TransitLine(
                name=name.replace("🚲", ""),
                car_type=extract_line_type(item.attrs["class"]),
                line_type=line_type,
                has_bike_rack="🚲" in name,
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
            self.logger.info("Stored %d transit lines in db", len(lines))
        return lines

    def fetch_schedules(
        self, lines: List[TransitLine] = None, occurrence=None, commit=True
    ) -> List[Schedule]:
        lines = lines or TransitLine.objects.all()
        schedules = []
        for line in lines:
            if occurrence:
                schedules.append(
                    (
                        line,
                        occurrence,
                        self.DETAIL_URL.format(line.name.upper(), occurrence.lower()),
                    )
                )
            else:
                schedules.extend(
                    [
                        (line, occ, self.DETAIL_URL.format(line.name.upper(), occ))
                        for occ in ["lv", "s", "d"]
                    ]
                )
        self.logger.info(
            "Fetching %d schedules for %d transit lines", len(schedules), len(lines)
        )
        schedules = [s for s in asyncio.run(self.request_many(schedules)) if s]
        if commit:
            Schedule.objects.bulk_create(
                schedules,
                update_conflicts=True,
                update_fields=[
                    "terminal1_schedule",
                    "terminal2_schedule",
                    "schedule_start_date",
                ],
                unique_fields=list(*Schedule._meta.unique_together),
            )
            self.logger.info("Stored %d schedules in db", len(schedules))
        return schedules

    async def request(self, session, sem, schedule):
        line, occ, url = schedule
        async with sem:
            headers = {"Referer": "https://ctpcj.ro/"}
            try:
                async with session.get(url, headers=headers) as response:
                    if response.status not in [
                        status.HTTP_200_OK,
                        status.HTTP_404_NOT_FOUND,
                    ]:
                        msg = f"Unexpected status for {url}. Status: {response.status}"
                        raise ValueError(msg)
                    return await response.text(), line, occ, url
            except aiohttp.client_exceptions.ClientConnectorError as e:
                self.logger.error(e)
                return "", url

    async def request_many(self, schedules):
        sem = asyncio.Semaphore(1000)
        async with aiohttp.ClientSession() as session:
            return map(
                self.parse_schedule,
                await asyncio.gather(
                    *[self.request(session, sem, schedule) for schedule in schedules]
                ),
            )

    def parse_schedule(self, args) -> Optional[Schedule]:
        response, line, occ, url = args
        if not response or "<title> 404 Not Found" in response:
            self.logger.warning("No or 404 in response for %s", url)
            return

        rows = [row.strip() for row in response.split("\n") if row.strip()]
        date_row = rows[2].split(",")[1].rstrip(".")
        try:
            schedule_start_date = (
                datetime.strptime(date_row, "%d.%m.%Y") if date_row else None
            )
        except ValueError:
            if date_row == "20.02.20232":
                schedule_start_date = datetime.strptime(date_row, "%d.%m.%Y2")
            elif date_row == "17.05.2024.2024":
                schedule_start_date = datetime.strptime(date_row, "%d.%m.%Y.2024")
            elif date_row == ".":
                schedule_start_date = None
            else:
                raise

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
