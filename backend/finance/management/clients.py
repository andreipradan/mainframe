import decimal
from decimal import Decimal

import requests
from bs4 import BeautifulSoup
from django.utils import timezone

from finance.models import ExchangeRate


class FetchExchangeRatesException(Exception):
    pass


def request(url, logger) -> BeautifulSoup:
    resp = requests.get(url)
    try:
        resp.raise_for_status()
    except requests.exceptions.HTTPError as e:
        logger.exception(e)
        raise FetchExchangeRatesException("Error fetching exchange rates")
    return BeautifulSoup(resp.content, features="xml")


def fetch_from_bnr(logger):
    url = "https://www.bnr.ro/nbrfxrates.xml"
    soup = request(url, logger)

    orig_currency = soup.find("OrigCurrency").text
    publishing_date = soup.find("PublishingDate").text
    source = soup.find("Publisher").text

    rates = []
    for cube in soup.find_all("Cube"):
        date = cube.attrs["date"]
        for tag in cube.find_all("Rate"):
            currency = tag.attrs["currency"]
            try:
                value = Decimal(tag.text)
            except decimal.InvalidOperation:
                logger.error(
                    f"Invalid rate found for {currency}-{orig_currency} "
                    f"on {date} from {source}: {tag.text}"
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

    rates = ExchangeRate.objects.bulk_create(
        rates,
        update_conflicts=True,
        update_fields=[
            "value",
        ],
        unique_fields=list(*ExchangeRate._meta.unique_together),
    )

    return publishing_date, len(rates)


def fetch_from_ecb(logger):
    url = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
    soup = request(url, logger)

    source = soup.find("gesmes:name").text

    rates = []
    for cube in [x for x in soup.Cube.find_all("Cube") if x.attrs.get("time")]:
        date = cube.attrs["time"]
        for tag in cube.find_all("Cube"):
            currency = tag.attrs["currency"]
            try:
                value = Decimal(tag.attrs["rate"])
            except decimal.InvalidOperation:
                logger.error(
                    f"Invalid rate found for {currency}-EUR "
                    f"on {date} from {source}: {tag.text}"
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

    rates = ExchangeRate.objects.bulk_create(
        rates,
        update_conflicts=True,
        update_fields=["value"],
        unique_fields=list(*ExchangeRate._meta.unique_together),
    )

    return timezone.now().date(), len(rates)
