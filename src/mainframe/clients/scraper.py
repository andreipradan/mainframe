from typing import Union

import requests
from bs4 import BeautifulSoup
from requests import Response


def fetch(
    url, logger, retries=0, soup=True, timeout=45, **kwargs
) -> tuple[Union[BeautifulSoup, Response, None], None]:
    logger.info("Fetching: %s", url)
    try:
        response = requests.get(url, timeout=timeout, **kwargs)
        response.raise_for_status()
    except (
        requests.exceptions.ConnectionError,
        requests.exceptions.HTTPError,
        requests.exceptions.ReadTimeout,
    ) as e:
        logger.error(str(e))
        if retries > 0:
            return fetch(url, logger, retries - 1, soup, timeout, **kwargs)
        return None, e
    if not soup:
        return response, None
    return BeautifulSoup(response.content, features="html.parser"), None
