import hashlib
import hmac
import json

import requests
from mainframe.sources.models import Source
from rest_framework import status


class DevicesException(Exception):
    pass


class DevicesClient:
    def __init__(self, source: Source):
        self.source = source

    @staticmethod
    def create_token(key, msg):
        return hmac.new(key.encode(), msg.encode(), hashlib.sha256).hexdigest()

    def login(self):
        resp = requests.post(
            self.source.url,
            headers=self.source.headers,
            json=self.source.config["data"]["login"],
            timeout=30,
        )
        if resp.status_code != status.HTTP_200_OK:
            raise DevicesException(f"Unexpected response {resp.status_code}")
        return resp.json()["uuid"]

    def run(self):
        uuid = self.login()
        data = self.source.config["data"]["list"]
        headers = {
            "Cookie": f"uuid={uuid}; username={self.source.config['username']}",
            "X-XSRF-TOKEN": self.create_token(uuid, json.dumps(data)),
            **self.source.headers,
        }
        response = requests.post(
            self.source.url, headers=headers, json=data, timeout=30
        )
        if response.status_code != status.HTTP_200_OK:
            raise DevicesException(f"Unexpected response {response.status_code}")
        response = response.json()
        if set(response) != {"ret", "topo"}:
            raise DevicesException(f"Got different top level keys: {set(response)}")
        if len(response["topo"]) != 1:
            raise DevicesException(f"Got multiple routers: {len(response['topo'])}")

        return list(map(parse_device, response["topo"][0]["sta"]))


def parse_device(device):
    return {
        "additional_data": device,
        "ip": device.pop("ipv4").replace("_point_", "."),
        "is_active": True,
        "mac": device.pop("mac").upper(),
        "name": device.pop("name"),
    }
