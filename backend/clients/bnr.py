import decimal
from decimal import Decimal

import requests
from bs4 import BeautifulSoup

from finance.models import ExchangeRate


class FetchExchangeRatesException(Exception):
    pass


def fetch_exchange_rates(logger):
    url = "https://www.bnr.ro/nbrfxrates.xml"
    resp = requests.get(url)
    try:
        resp.raise_for_status()
    except requests.exceptions.HTTPError as e:
        logger.exception(e)
        raise FetchExchangeRatesException("Error fetching exchange rates")

    soup = BeautifulSoup(resp.content, features="xml")

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
                    f"on {date} from {source}: {tag.text}")
                continue
            if multiplier := tag.attrs.get("multiplier"):
                value /= Decimal(multiplier)
            rates.append(
                ExchangeRate(
                    date=date,
                    source=source,
                    symbol=f"{currency}{orig_currency}",
                    value=value,
                ))

    rates = ExchangeRate.objects.bulk_create(
        rates,
        update_conflicts=True,
        update_fields=[
            "value",
        ],
        unique_fields=list(*ExchangeRate._meta.unique_together),
    )

    return publishing_date, len(rates)
