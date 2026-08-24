import decimal
import re
from decimal import Decimal

from bs4 import BeautifulSoup
from defusedxml import ElementTree

from mainframe.clients.scraper import fetch
from mainframe.exchange.models import ExchangeRate


class FetchExchangeRatesException(Exception):
    pass


class BaseExchange:
    batch_size = 5000
    base = NotImplemented
    url = NotImplemented

    def __init__(self, logger):
        self.logger = logger

    def do_request(self, url):
        resp, error = fetch(url, soup=False, timeout=20)
        if error:
            raise FetchExchangeRatesException("Error fetching exchange rates")
        return resp.content

    def fetch(self, full):
        urls = self.fetch_available_urls() if full else [self.url]

        rates = []
        for url in urls[:2]:
            self.logger.info("Fetching URL", url=url)
            rates += self.parse(self.do_request(url))

        self.logger.info(
            "Saving events in batches",
            count=len(rates),
            batch_size=self.batch_size,
        )
        rates = ExchangeRate.objects.bulk_create(
            rates,
            update_conflicts=True,
            update_fields=[
                "value",
            ],
            unique_fields=list(*ExchangeRate._meta.unique_together),
            batch_size=self.batch_size,
        )
        return len(rates)

    def fetch_available_urls(self) -> list[str]:
        raise NotImplementedError

    def parse(self, content) -> list[ExchangeRate]:
        raise NotImplementedError


class BNR(BaseExchange):
    base = "https://curs.bnr.ro"
    url = f"{base}/nbrfxrates.xml"

    def fetch_available_urls(self):
        soup = BeautifulSoup(self.do_request(self.base), "html.parser")

        return [
            x.attrs["href"]
            for x in soup.find("ul", {"class": "links"}).select("A")
            if "/years/" in x.attrs["href"]
        ]

    def parse(self, content) -> list[ExchangeRate]:
        raw = content
        if isinstance(content, (bytes, bytearray)):
            raw = content.decode("utf-8", errors="ignore")

        # Remove default xmlns (e.g. xmlns="https://...")
        # so ElementTree finds tags by local name
        raw = re.sub(r'\sxmlns="[^"]+"', "", raw, count=1)

        root = ElementTree.fromstring(raw)

        orig_currency = root.find("Body/OrigCurrency").text
        source = root.find("Header/Publisher") or root.find(".//Publisher").text

        rates = []
        for cube in root.findall(".//Cube[@date]"):
            date = cube.attrib.get("date")
            for tag in cube.findall(".//Rate"):
                currency = tag.attrib.get("currency")
                try:
                    value = Decimal(tag.text)
                except (decimal.InvalidOperation, TypeError):
                    self.logger.exception(
                        "Invalid rate found",
                        currency=currency,
                        origin_currency=orig_currency,
                        date=date,
                        source=source,
                        text=tag.text,
                    )
                    continue
                if multiplier := tag.attrib.get("multiplier"):
                    value /= Decimal(multiplier)
                rates.append(
                    ExchangeRate(
                        date=date,
                        source=source,
                        symbol=f"{currency}{orig_currency}",
                        value=value,
                    )
                )
        return rates


class ECB(BaseExchange):
    base = "https://www.ecb.europa.eu"
    url = f"{base}/stats/eurofxref/eurofxref-daily.xml"

    def fetch_available_urls(self):
        return [f"{self.base}/stats/eurofxref/eurofxref-hist.xml"]

    def parse(self, content):
        root = ElementTree.fromstring(content)
        namespaces = {
            "gesmes": "http://www.gesmes.org/xml/2002-08-01",
            "": "http://www.ecb.int/vocabulary/2002-08-01/eurofxref",
        }

        source = root.find("gesmes:Sender/gesmes:name", namespaces).text

        rates = []
        for cube in root.findall(".//Cube[@time]", namespaces):
            date = cube.attrib["time"]
            for tag in cube.findall(".//Cube[@currency]", namespaces):
                currency = tag.attrib["currency"]
                try:
                    value = Decimal(tag.attrib["rate"])
                except decimal.InvalidOperation:
                    self.logger.exception(
                        "Invalid EUR rate found",
                        currency=currency,
                        date=date,
                        source=source,
                        text=tag.text,
                    )
                    continue
                if multiplier := tag.attrib.get("multiplier"):
                    value /= Decimal(multiplier)
                rates.append(
                    ExchangeRate(
                        date=date,
                        source=source,
                        symbol=f"{currency}EUR",
                        value=value,
                    )
                )
        return rates
