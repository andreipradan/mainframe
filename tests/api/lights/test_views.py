import json
from unittest import mock

import pytest
from rest_framework import status

from mainframe.clients.lights import LightsException


@pytest.mark.django_db
class TestLightsViewSet:
    @mock.patch("mainframe.api.lights.views.LightsClient.get_bulbs")
    def test_list_lights(self, mock_get_bulbs, client, staff_session):
        mock_bulbs = [
            {"id": "light1", "name": "Living Room", "ip": "192.168.1.100"},
            {"id": "light2", "name": "Bedroom", "ip": "192.168.1.101"},
        ]
        mock_get_bulbs.return_value = mock_bulbs

        response = client.get("/lights/", HTTP_AUTHORIZATION=staff_session.token)

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"count": 2, "results": mock_bulbs}
        mock_get_bulbs.assert_called_once()

    def test_list_lights_unauthorized(self, client, session):
        response = client.get("/lights/", HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_lights_unauthenticated(self, client):
        response = client.get("/lights/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @mock.patch("mainframe.api.lights.views.LightsClient.turn_on")
    def test_turn_on_light(self, mock_turn_on, client, staff_session):
        mock_turn_on.return_value = {"status": "ok"}
        ip = "192.168.1.100"

        response = client.put(
            f"/lights/{ip}/turn-on/",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["status"] == "ok"
        mock_turn_on.assert_called_once_with(ip=ip)

    @mock.patch("mainframe.api.lights.views.LightsClient.turn_off")
    def test_turn_off_light(self, mock_turn_off, client, staff_session):
        mock_turn_off.return_value = {"status": "ok"}
        ip = "192.168.1.100"

        response = client.put(
            f"/lights/{ip}/turn-off/",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["status"] == "ok"
        mock_turn_off.assert_called_once_with(ip=ip)

    @mock.patch("mainframe.api.lights.views.LightsClient.turn_all_on")
    def test_turn_all_on(self, mock_turn_all_on, client, staff_session):
        mock_turn_all_on.return_value = {"status": "all_on"}

        response = client.put(
            "/lights/turn-all-on/",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["status"] == "all_on"
        mock_turn_all_on.assert_called_once()

    @mock.patch("mainframe.api.lights.views.LightsClient.turn_all_off")
    def test_turn_all_off(self, mock_turn_all_off, client, staff_session):
        mock_turn_all_off.return_value = {"status": "all_off"}

        response = client.put(
            "/lights/turn-all-off/",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["status"] == "all_off"
        mock_turn_all_off.assert_called_once()

    @mock.patch("mainframe.api.lights.views.LightsClient.set_brightness")
    def test_set_brightness(self, mock_set_brightness, client, staff_session):
        mock_set_brightness.return_value = {"brightness": 100}
        ip = "192.168.1.100"
        data = {"brightness": 100}

        response = client.patch(
            f"/lights/{ip}/set-brightness/",
            data=json.dumps(data),
            content_type="application/json",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["brightness"] == 100
        mock_set_brightness.assert_called_once_with(ip=ip, brightness=100)

    @mock.patch("mainframe.api.lights.views.LightsClient.set_color_temp")
    def test_set_color_temp(self, mock_set_color_temp, client, staff_session):
        mock_set_color_temp.return_value = {"color_temp": 3000}
        ip = "192.168.1.100"
        data = {"color_temp": 3000}

        response = client.patch(
            f"/lights/{ip}/set-color-temp/",
            data=json.dumps(data),
            content_type="application/json",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["color_temp"] == 3000
        mock_set_color_temp.assert_called_once_with(ip=ip, color_temp=3000)

    @mock.patch("mainframe.api.lights.views.LightsClient.set_rgb")
    def test_set_rgb(self, mock_set_rgb, client, staff_session):
        mock_set_rgb.return_value = {"rgb": "ff0000"}
        ip = "192.168.1.100"
        data = {"rgb": "ff0000"}

        response = client.patch(
            f"/lights/{ip}/set-rgb/",
            data=json.dumps(data),
            content_type="application/json",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["rgb"] == "ff0000"
        mock_set_rgb.assert_called_once_with(ip=ip, rgb="ff0000")

    @mock.patch("mainframe.api.lights.views.LightsClient.set_name")
    def test_set_name(self, mock_set_name, client, staff_session):
        mock_set_name.return_value = {"name": "Office Light"}
        ip = "192.168.1.100"
        data = {"name": "Office Light"}

        response = client.patch(
            f"/lights/{ip}/set-name/",
            data=json.dumps(data),
            content_type="application/json",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["name"] == "Office Light"
        mock_set_name.assert_called_once_with(ip=ip, name="Office Light")

    @mock.patch("mainframe.api.lights.views.LightsClient.turn_on")
    def test_turn_on_light_exception(self, mock_turn_on, client, staff_session):
        mock_turn_on.side_effect = LightsException("Light not found")
        ip = "192.168.1.100"

        response = client.put(
            f"/lights/{ip}/turn-on/",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Light not found" in str(response.json()["error"])

    @mock.patch("mainframe.api.lights.views.LightsClient.set_brightness")
    def test_set_brightness_exception(self, mock_set_brightness, client, staff_session):
        mock_set_brightness.side_effect = LightsException("Invalid brightness value")
        ip = "192.168.1.100"
        data = {"brightness": 999}

        response = client.patch(
            f"/lights/{ip}/set-brightness/",
            data=json.dumps(data),
            content_type="application/json",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid brightness value" in str(response.json()["error"])
