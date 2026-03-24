import pytest
from rest_framework import status

from tests.factories.events import EventFactory


@pytest.mark.django_db
class TestEventViewSet:
    def test_list_events(self, client, staff_session):
        EventFactory()
        response = client.get("/events/", HTTP_AUTHORIZATION=staff_session.token)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["title"].startswith("Event")
