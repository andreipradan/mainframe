import pytest
from rest_framework import status


@pytest.mark.django_db
class TestCommandsViewSet:
    def test_commands_unauthorized(self, client, session):
        """Test executing commands as non-admin returns 403"""
        response = client.get(
            "/commands/",
            content_type="application/json",
            HTTP_AUTHORIZATION=session.token,
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_commands_unauthenticated(self, client):
        """Test executing commands without authentication returns 403"""
        response = client.get(
            "/commands/",
            content_type="application/json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
