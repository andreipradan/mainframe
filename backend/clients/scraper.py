import requests
from bs4 import BeautifulSoup


def fetch(url, logger):
    logger.info("Fetching: %s", url)
    try:
        response = requests.get(url, timeout=45)
        response.raise_for_status()
    except (
            requests.exceptions.ConnectionError,
            requests.exceptions.HTTPError,
            requests.exceptions.ReadTimeout,
    ) as e:
        logger.error(str(e))
        return e
    return BeautifulSoup(response.content, features="html.parser")
