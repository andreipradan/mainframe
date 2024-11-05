import decimal
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
        resp, error = fetch(url, self.logger, soup=False, timeout=20)
        if error:
            self.logger.exception(error)
            raise FetchExchangeRatesException("Error fetching exchange rates")
        return resp.content

    def fetch(self, full):
        urls = self.fetch_available_urls() if full else [self.url]

        rates = []
        for url in urls[:2]:
            self.logger.info("Fetching %s", url)
            rates += self.parse(self.do_request(url))

        self.logger.info(
            "Saving %d%s",
            len(rates),
            " in batches of 5000" if len(rates) > self.batch_size else "",
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
    base = "https://www.bnr.ro"
    url = f"{base}/nbrfxrates.xml"

    def fetch_available_urls(self):
        url = f"{self.base}/Cursurile-pietei-valutare-in-format-XML-3424-Mobile.aspx"
        soup = BeautifulSoup(self.do_request(url), "html.parser")

        return [
            f"{self.base}{x.attrs['href']}"
            for x in soup.find("div", {"id": "column-secondary"}).select("A")
            if "/years/" in x.attrs["href"]
        ]

    def parse(self, content) -> list[ExchangeRate]:
        root = ElementTree.fromstring(content)
        namespaces = {"ns": "http://www.bnr.ro/xsd"}

        orig_currency = root.find("ns:Body/ns:OrigCurrency", namespaces).text
        source = root.find("ns:Header/ns:Publisher", namespaces).text

        rates = []
        for cube in root.findall(".//ns:Cube[@date]", namespaces):
            date = cube.attrib["date"]
            for tag in cube.findall(".//ns:Rate", namespaces):
                currency = tag.attrib["currency"]
                try:
                    value = Decimal(tag.text)
                except decimal.InvalidOperation:
                    self.logger.error(
                        "Invalid rate found for %s-%s on %s from %s: %s",
                        currency,
                        orig_currency,
                        date,
                        source,
                        tag.text,
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
                    self.logger.error(
                        "Invalid rate found for %s-EUR on %s from %s: %s",
                        currency,
                        date,
                        source,
                        tag.text,
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
