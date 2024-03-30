from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from django.db import models

from core.models import TimeStampedModel


class Watcher(TimeStampedModel):
    is_active = models.BooleanField(default=True)
    latest = models.JSONField(default=dict)
    name = models.CharField(max_length=255, unique=True)
    request = models.JSONField(default=dict)
    selector = models.CharField(max_length=128)
    url = models.URLField()

    def __str__(self):
        return self.name

    def run(self):
        response = requests.get(self.url, timeout=10, **self.request)
        if response.status_code != 200:  # noqa: PLR2004
            return f"Request failed with status code {response.status_code}"

        soup = BeautifulSoup(response.text, "html.parser")
        elements = soup.select(self.selector)
        if not elements:
            return f"Watcher {self.name} did not found any elements"

        if self.latest["title"] != (found := elements[0]).text:
            self.latest = {
                "title": found.text,
                "url": urljoin(self.url, found.attrs["href"])
                if found.attrs["href"].startswith("/")
                else found.attrs["href"],
            }
            self.save()
            return True
        return False
