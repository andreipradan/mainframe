import random

from bs4 import BeautifulSoup
from django.conf import settings
from mainframe.clients.logs import get_default_logger
from mainframe.clients.scraper import fetch

logger = get_default_logger(__name__)


class DexOnlineError(Exception):
    ...


class DexOnlineNotFoundError(DexOnlineError):
    ...


def fetch_definition(word=None):
    dex_url = "https://dexonline.ro/definitie/{}/json"

    if not word:
        min_len = 5
        data_path = settings.BASE_DIR / "bots" / "management" / "commands" / "data"
        with open(data_path / "ro-words.txt", "r") as file:
            while len(word := random.choice(file.readlines())) < min_len:  # noqa: S311
                ...

    response, error = fetch(dex_url.format(word.strip()), logger, 1, False, timeout=10)
    if error:
        logger.error(str(error))
        raise DexOnlineError(error)

    response = response.json()
    if not response["definitions"]:
        raise DexOnlineNotFoundError(f"Could not find any definitions for '{word}'")

    definition = BeautifulSoup(response["definitions"][0]["htmlRep"], "html.parser")
    for tag_name in ["abbr", "span", "sup"]:
        for tag in definition.find_all(tag_name):
            tag.replace_with(tag.text)
    return definition.text.split()[0], " ".join(definition.text.split()[1:]).strip()
