from unittest import mock

import pytest
from rest_framework import status


@pytest.mark.django_db
class TestLogsViewSet:
    @mock.patch("mainframe.api.logs.views.get_folder_contents")
    def test_list_logs_root(self, mock_get_folder_contents, client, staff_session):
        mock_get_folder_contents.return_value = [
            {"name": "syslog", "is_file": True},
            {"name": "auth.log", "is_file": True},
        ]

        response = client.get("/logs/", HTTP_AUTHORIZATION=staff_session.token)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["path"] == ""
        assert len(data["results"]) == 2
        assert data["results"][0]["name"] == "syslog"

    @mock.patch("mainframe.api.logs.views.get_folder_contents")
    def test_list_logs_subdirectory(
        self, mock_get_folder_contents, client, staff_session
    ):
        mock_get_folder_contents.return_value = [
            {"name": "app.log", "is_file": True},
        ]

        response = client.get(
            "/logs/?path=app",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["path"] == "app"

    @mock.patch("mainframe.api.logs.views.get_folder_contents")
    def test_list_logs_path_normalization(
        self, mock_get_folder_contents, client, staff_session
    ):
        mock_get_folder_contents.return_value = []

        client.get(
            "/logs/?path=/app/logs",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        # Verify that leading slash was stripped
        call_args = mock_get_folder_contents.call_args[0][0]
        assert str(call_args).endswith("app/logs")

    @mock.patch("mainframe.api.logs.views.get_folder_contents")
    def test_list_logs_not_found(self, mock_get_folder_contents, client, staff_session):
        mock_get_folder_contents.side_effect = FileNotFoundError()

        response = client.get(
            "/logs/?path=nonexistent",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not found" in str(response.json()["error"]).lower()

    @mock.patch("builtins.open", create=True)
    def test_get_file_success(self, mock_open, client, staff_session):
        mock_file = mock.MagicMock()
        mock_file.__enter__.return_value.read.return_value = "log content here"
        mock_open.return_value = mock_file

        response = client.get(
            "/logs/?filename=syslog",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_200_OK
        assert b"log content here" in b"".join(response.streaming_content)

    @mock.patch("builtins.open", create=True)
    def test_get_file_with_path(self, mock_open, client, staff_session):
        mock_file = mock.MagicMock()
        mock_file.__enter__.return_value.read.return_value = "nested log"
        mock_open.return_value = mock_file

        response = client.get(
            "/logs/?filename=app/service.log",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_200_OK
        assert b"nested log" in b"".join(response.streaming_content)

    @mock.patch("builtins.open", create=True)
    def test_get_file_encoding_error(self, mock_open, client, staff_session):
        mock_open.side_effect = UnicodeDecodeError(
            "utf-8", b"", 0, 1, "invalid start byte"
        )

        response = client.get(
            "/logs/?filename=binary.log",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_logs_unauthorized(self, client, session):
        response = client.get("/logs/", HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_logs_unauthenticated(self, client):
        response = client.get("/logs/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @mock.patch("mainframe.api.logs.views.get_folder_contents")
    def test_list_logs_with_directories(
        self, mock_get_folder_contents, client, staff_session
    ):
        mock_get_folder_contents.return_value = [
            {"name": "app", "is_file": False},
            {"name": "syslog", "is_file": True},
            {"name": "auth.log", "is_file": True},
            {"name": "nginx", "is_file": False},
        ]

        response = client.get("/logs/", HTTP_AUTHORIZATION=staff_session.token)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["results"]) == 4
        dirs = [r for r in data["results"] if not r["is_file"]]
        files = [r for r in data["results"] if r["is_file"]]
        assert len(dirs) == 2
        assert len(files) == 2
