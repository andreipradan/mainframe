import logging

import environ
import requests


def ping(logger, service_name="URL"):
    config = environ.Env()
    var_name = f"HEALTHCHECKS_{service_name.replace('-', '_').upper()}"
    url = config(var_name, default=None)
    if url is None:
        logger.warning("%s not set on env, skipping healthcheck", var_name)
        return
    try:
        requests.post(url=url, timeout=20)
    except requests.exceptions.HTTPError as e:
        logger = logger or logging.getLogger(__name__)
        logger.warning(str(e))
