import hashlib
import hmac
import json
from operator import attrgetter

import requests
from actstream.models import Action
from django.db import IntegrityError
from django.utils import timezone
from mainframe.core.exceptions import MainframeError
from mainframe.devices.models import Device
from mainframe.sources.models import Source
from rest_framework import status


class DevicesException(MainframeError):
    ...


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
            existing_devices = list(Device.objects.all())
            new_devices = [
                device
                for device in devices
                if device.mac not in list(map(attrgetter("mac"), existing_devices))
            ]

            active_macs = list(map(attrgetter("mac"), devices))
            went_online = [
                device
                for device in existing_devices
                if not device.is_active and device.mac in active_macs
            ]
            went_offline = [
                device
                for device in existing_devices
                if device.is_active and device.mac not in active_macs
            ]
            self.logger.info(
                "Got %d devices%s",
                len(devices),
                f" ({len(new_devices)} new ones)" if new_devices else "",
                extra={
                    "new_devices": new_devices,
                    "went_online": went_online,
                    "went_offline": went_offline,
                },
            )

            if went_offline:
                Device.objects.filter(
                    mac__in=map(attrgetter("mac"), went_offline)
                ).update(is_active=False)

            try:
                Device.objects.bulk_create(
                    devices,
                    update_conflicts=True,
                    update_fields=[
                        "additional_data",
                        "is_active",
                        "ip",
                        "name",
                        "last_seen",
                    ],
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

            Action.objects.bulk_create(
                [
                    *[
                        Action(actor=device, verb="was created")
                        for device in new_devices
                    ],
                    *[
                        Action(actor=device, verb="went offline")
                        for device in went_offline
                    ],
                    *[
                        Action(actor=device, verb="went online")
                        for device in went_online
                    ],
                ]
            )
            return new_devices, went_online, went_offline
        self.logger.warning("Got no devices.")
        return []


def parse_device(device):
    return Device(
        additional_data=device,
        ip=device.pop("ipv4").replace("_point_", "."),
        is_active=True,
        mac=device.pop("mac").upper(),
        name=device.pop("name"),
        last_seen=timezone.now(),
    )
