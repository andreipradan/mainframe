import environ
import requests


def ping():
    config = environ.Env()
    url = config("HEALTHCHECKS_URL")
    return requests.post(url=url)
