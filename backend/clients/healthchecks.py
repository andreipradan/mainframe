import logging

import environ
import requests


def ping(service_name="URL", logger=None):
    config = environ.Env()
    url = config(f"HEALTHCHECKS_{service_name.upper()}")
    try:
        requests.post(url=url)
    except requests.exceptions.HTTPError as e:
        logger = logger or logging.getLogger(__name__)
        logger.warning(str(e))
