import requests
from bs4 import BeautifulSoup
from requests import Response


def fetch(
    url, logger, retries=0, soup=True, timeout=45, **kwargs
) -> tuple[BeautifulSoup | Response | None, Exception | None]:
    method = kwargs.pop("method", "GET")
    logger.debug("Sending '%s' request to '%s'", method, url)
    try:
        response = requests.request(method, url, timeout=timeout, **kwargs)
        response.raise_for_status()
    except (
        requests.exceptions.ConnectionError,
        requests.exceptions.HTTPError,
        requests.exceptions.ReadTimeout,
        requests.exceptions.TooManyRedirects,
    ) as e:
        if retries > 0:
            return fetch(url, logger, retries - 1, soup, timeout, **kwargs)
        return None, e
    if not soup:
        return response, None
    return BeautifulSoup(response.content, features="html.parser"), None
