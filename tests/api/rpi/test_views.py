from unittest import mock

import pytest
from rest_framework import status


@pytest.mark.django_db
class TestRpiViewSet:
    """Test cases for Raspberry Pi control endpoints"""

    @mock.patch("mainframe.api.rpi.views.run_cmd")
    def test_reboot_command(self, mock_run_cmd, client, staff_session):
        """Test reboot command"""
        mock_run_cmd.return_value = "Rebooting..."

        response = client.put("/rpi/reboot/", HTTP_AUTHORIZATION=staff_session.token)

        assert response.status_code == status.HTTP_204_NO_CONTENT

    @mock.patch("mainframe.api.rpi.views.set_tasks")
    def test_reset_tasks_command(self, mock_set_tasks, client, staff_session):
        """Test reset tasks command"""
        response = client.put(
            "/rpi/reset-tasks/", HTTP_AUTHORIZATION=staff_session.token
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_set_tasks.assert_called_once()

    def test_rpi_reboot_unauthorized(self, client, session):
        """Test accessing rpi reboot as non-admin returns 403"""
        response = client.put("/rpi/reboot/", HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rpi_reboot_unauthenticated(self, client):
        """Test accessing rpi reboot without authentication returns 403"""
        response = client.put("/rpi/reboot/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @mock.patch("mainframe.api.rpi.views.run_cmd")
    def test_restart_service_error(self, mock_run_cmd, client, staff_session):
        """Test error handling for service restart command"""
        mock_run_cmd.side_effect = RuntimeError("Service not found")

        response = client.put(
            "/rpi/restart-service/",
            data={"service": "unknown"},
            HTTP_AUTHORIZATION=staff_session.token,
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
