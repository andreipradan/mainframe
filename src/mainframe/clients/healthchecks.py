import environ
import requests
import structlog


def ping(logger, service_name="URL"):
    config = environ.Env()
    var_name = f"HEALTHCHECKS_{service_name.replace('-', '_').upper()}"
    url = config(var_name, default=None)
    if url is None:
        logger.warning(
            "Environment variable not set, skipping healthcheck", var_name=var_name
        )
        return
    try:
        requests.post(url=url, timeout=20)
    except requests.exceptions.HTTPError as e:
        logger = logger or structlog.get_logger(__name__)
        logger.warning(str(e))
