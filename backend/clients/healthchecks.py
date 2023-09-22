import environ
import requests

from clients.logs import get_default_logger


def ping(service_name="URL", logger=None):
    config = environ.Env()
    url = config(f"HEALTHCHECKS_{service_name.replace('-', '_').upper()}")
    try:
        requests.post(url=url)
    except requests.exceptions.HTTPError as e:
        logger = logger or get_default_logger(__name__)
        logger.warning(str(e))
