import json
from unittest import mock

import pytest
from rest_framework import status


@pytest.mark.django_db
@mock.patch("mainframe.api.huey_tasks.views.HUEY._registry")
class TestTasksViewSet:
    @mock.patch("mainframe.api.huey_tasks.views.get_redis_client")
    def test_list_tasks(self, mock_redis, mock_huey, client, staff_session):
        """Test listing all available tasks"""
        mock_client = mock.MagicMock()
        mock_client.get.return_value = None
        mock_redis.return_value = mock_client

        mock_huey._registry.__iter__.return_value = [
            "mainframe.api.task1",
            "mainframe.api.task2",
        ]

        response = client.get("/tasks/", HTTP_AUTHORIZATION=staff_session.token)

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {
            "results": [
                {
                    "app": "api",
                    "name": "task1",
                    "id": "api.task1",
                    "is_periodic": False,
                    "is_revoked": mock.ANY,
                },
                {
                    "app": "api",
                    "name": "task2",
                    "id": "api.task2",
                    "is_periodic": False,
                    "is_revoked": mock.ANY,
                },
            ]
        }

    @mock.patch("mainframe.api.huey_tasks.views.get_redis_client")
    def test_list_tasks_with_history(
        self, mock_redis, mock_huey, client, staff_session
    ):
        mock_client = mock.MagicMock()
        task_history = {
            "history": [{"status": "success", "timestamp": "2024-01-01"}],
            "errors": [],
        }
        mock_client.get.return_value = json.dumps(task_history).encode()
        mock_redis.return_value = mock_client
        mock_huey._registry.__iter__.return_value = ["mainframe.core.my_task"]

        response = client.get("/tasks/", HTTP_AUTHORIZATION=staff_session.token)

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {
            "results": [
                {
                    "app": "core",
                    "name": "my_task",
                    "id": "core.my_task",
                    "is_periodic": False,
                    "is_revoked": mock.ANY,
                    "history": [{"status": "success", "timestamp": "2024-01-01"}],
                    "errors": [],
                }
            ]
        }

    def test_tasks_unauthorized(self, _, client, session):
        response = client.get("/tasks/", HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_tasks_unauthenticated(self, _, client):
        response = client.get("/tasks/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @mock.patch("mainframe.api.huey_tasks.views.get_redis_client")
    def test_delete_task_history(self, mock_redis, _, client, staff_session):
        mock_client = mock.MagicMock()
        mock_client.delete.return_value = 1
        mock_client.get.return_value = None
        mock_redis.return_value = mock_client

        response = client.delete(
            "/tasks/my_task/delete-history/",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_200_OK
        mock_client.delete.assert_called_once()

    @mock.patch("mainframe.api.huey_tasks.views.get_redis_client")
    def test_delete_task_history_not_found(self, mock_redis, _, client, staff_session):
        mock_client = mock.MagicMock()
        mock_client.delete.return_value = 0
        mock_redis.return_value = mock_client

        response = client.delete(
            "/tasks/nonexistent/delete-history/",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json() == {"detail": "No history found"}
