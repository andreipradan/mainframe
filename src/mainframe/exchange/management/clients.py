import decimal
from decimal import Decimal

import requests
from bs4 import BeautifulSoup
from mainframe.exchange.models import ExchangeRate


class FetchExchangeRatesException(Exception):
    pass


class BaseExchange:
    base = NotImplemented
    url = NotImplemented

    def __init__(self, logger):
        self.logger = logger

    def do_request(self, url) -> BeautifulSoup:
        resp = requests.get(url, timeout=20)
        try:
            resp.raise_for_status()
        except requests.exceptions.HTTPError as e:
            self.logger.exception(e)
            raise FetchExchangeRatesException("Error fetching exchange rates") from e
        return BeautifulSoup(resp.content, features="xml")

    def fetch(self, full):
        urls = self.fetch_available_urls() if full else [self.url]

        rates = []
        for url in urls[:2]:
            self.logger.info("Fetching %s", url)
            soup = self.do_request(url)
            rates += self.parse(soup)

        self.logger.info("Saving %d in batches of 5000", len(rates))
        rates = ExchangeRate.objects.bulk_create(
            rates,
            update_conflicts=True,
            update_fields=[
                "value",
            ],
            unique_fields=list(*ExchangeRate._meta.unique_together),
            batch_size=5000,
        )
        return len(rates)

    def fetch_available_urls(self) -> list[str]:
        raise NotImplementedError

    def parse(self, soup: BeautifulSoup) -> list[ExchangeRate]:
        raise NotImplementedError


class BNR(BaseExchange):
    base = "https://www.bnr.ro"
    url = f"{base}/nbrfxrates.xml"

    def fetch_available_urls(self):
        url = f"{self.base}/Cursurile-pietei-valutare-in-format-XML-3424-Mobile.aspx"
        soup = self.do_request(url)

        return [
            f"{self.base}{x.attrs['href']}"
            for x in soup.find("div", {"id": "column-secondary"}).select("A")
            if "/years/" in x.attrs["href"]
        ]

    def parse(self, soup: BeautifulSoup) -> list[ExchangeRate]:
        orig_currency = soup.find("OrigCurrency").text
        source = soup.find("Publisher").text

        rates = []
        for cube in soup.find_all("Cube"):
            date = cube.attrs["date"]
            for tag in cube.find_all("Rate"):
                currency = tag.attrs["currency"]
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
                if multiplier := tag.attrs.get("multiplier"):
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

    def parse(self, soup):
        source = soup.find("gesmes:name").text

        rates = []
        for cube in [x for x in soup.Cube.find_all("Cube") if x.attrs.get("time")]:
            date = cube.attrs["time"]
            for tag in cube.find_all("Cube"):
                currency = tag.attrs["currency"]
                try:
                    value = Decimal(tag.attrs["rate"])
                except decimal.InvalidOperation:
                    self.logger.error(
                        "Invalid rate found for %s-EUR on %s from %s: %s",
                        currency,
                        date,
                        source,
                        tag.text,
                    )
                    continue
                if multiplier := tag.attrs.get("multiplier"):
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
