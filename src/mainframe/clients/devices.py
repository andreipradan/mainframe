import hashlib
import hmac
import json

import requests
from django.db import IntegrityError
from mainframe.devices.models import Device
from mainframe.sources.models import Source
from rest_framework import status


class DevicesException(Exception):
    pass


class DevicesClient:
    def __init__(self, source: Source, logger):
        self.logger = logger
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
            raise DevicesException(f"Error at login - status: {resp.status_code}")
        if "errCode" in resp.json():
            raise DevicesException(f"Error at login - response {resp.json()}")
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
            raise DevicesException(f"Unexpected top level keys in response: {response}")
        if len(response["topo"]) != 1:
            raise DevicesException(f"Got multiple routers: {len(response['topo'])}")

        if devices := list(map(parse_device, response["topo"][0]["sta"])):
            existing_macs = Device.objects.values_list("mac", flat=True)
            new_macs = [d["mac"] for d in devices if d["mac"] not in existing_macs]
            self.logger.info(
                "Got %d devices%s",
                len(devices),
                f" ({len(new_macs)} new ones)" if new_macs else "",
            )

            Device.objects.update(is_active=False)
            try:
                Device.objects.bulk_create(
                    [Device(**d) for d in devices],
                    update_conflicts=True,
                    update_fields=["additional_data", "is_active", "ip", "name"],
                    unique_fields=["mac"],
                )
            except IntegrityError as e:
                self.logger.exception(
                    "Error while trying to store devices: %s\n\nDevices to save: %s",
                    e,
                    devices,
                )
                raise DevicesException(
                    "Error while trying to store devices. Check the logs"
                ) from e
            return new_macs
        self.logger.warning("Got no devices.")
        return []


def parse_device(device):
    return {
        "additional_data": device,
        "ip": device.pop("ipv4").replace("_point_", "."),
        "is_active": True,
        "mac": device.pop("mac").upper(),
        "name": device.pop("name"),
    }
