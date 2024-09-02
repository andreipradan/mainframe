import random

import requests
from bs4 import BeautifulSoup
from django.conf import settings


class DexOnlineError(Exception):
    ...


def fetch_definition(word=None):
    dex_url = "https://dexonline.ro/definitie/{}/json"

    if not word:
        min_len = 5
        data_path = settings.BASE_DIR / "bots" / "management" / "commands" / "data"
        with open(data_path / "ro-words.txt", "r") as file:
            while len(word := random.choice(file.readlines())) < min_len:  # noqa: S311
                ...

    try:
        response = requests.get(dex_url.format(word.strip()), timeout=10)
        response.raise_for_status()
    except (requests.exceptions.Timeout, requests.exceptions.HTTPError) as e:
        raise DexOnlineError from e

    response = response.json()
    definition = BeautifulSoup(response["definitions"][0]["htmlRep"], "html.parser")
    for tag_name in ["abbr", "span", "sup"]:
        for tag in definition.find_all(tag_name):
            tag.replace_with(tag.text)
    if "," in definition.text:
        return (
            definition.text.split(",")[0],
            ",".join(definition.text.split(",")[1:]).strip(),
        )
    return definition.text.split()[0], " ".join(definition.text.split()[1:]).strip()
