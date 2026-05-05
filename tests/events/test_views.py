from datetime import timedelta

import pytest
from django.utils import timezone
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

    def test_today_mode_filters(self, client, staff_session):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        EventFactory(
            title="Started Today",
            start_date=today_start + timedelta(hours=2),
            end_date=None,
        )
        EventFactory(
            title="Ongoing Event",
            start_date=today_start - timedelta(days=2),
            end_date=today_start + timedelta(days=1),
        )
        EventFactory(
            title="Ended Yesterday",
            start_date=today_start - timedelta(days=3),
            end_date=today_start - timedelta(hours=1),
        )

        active_response = client.get(
            "/events/?today_mode=active",
            HTTP_AUTHORIZATION=staff_session.token,
        )
        assert active_response.status_code == status.HTTP_200_OK
        assert active_response.data["count"] == 2
        assert {item["title"] for item in active_response.data["results"]} == {
            "Started Today",
            "Ongoing Event",
        }

        started_response = client.get(
            "/events/?today_mode=started",
            HTTP_AUTHORIZATION=staff_session.token,
        )
        assert started_response.status_code == status.HTTP_200_OK
        assert started_response.data["count"] == 1
        assert started_response.data["results"][0]["title"] == "Started Today"

    def test_location_filter(self, client, staff_session):
        EventFactory(title="Location A", location="Venue A")
        EventFactory(title="Location B", location="Venue B")

        response = client.get(
            "/events/?location=Venue B",
            HTTP_AUTHORIZATION=staff_session.token,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["title"] == "Location B"

    def test_locations_filtered_by_city(self, client, staff_session):
        # Create events in different cities with different locations
        EventFactory(title="Event 1", city="City A", location="Venue A1")
        EventFactory(title="Event 2", city="City A", location="Venue A2")
        EventFactory(title="Event 3", city="City B", location="Venue B1")

        # When no city is selected, all locations should be returned
        response = client.get("/events/", HTTP_AUTHORIZATION=staff_session.token)
        assert response.status_code == status.HTTP_200_OK
        locations = response.data["locations"]
        assert len(locations) == 3
        assert "Venue A1" in locations
        assert "Venue A2" in locations
        assert "Venue B1" in locations

        # When City A is selected, only locations from City A should be returned
        response = client.get(
            "/events/?city=City A", HTTP_AUTHORIZATION=staff_session.token
        )
        assert response.status_code == status.HTTP_200_OK
        locations = response.data["locations"]
        assert len(locations) == 2
        assert "Venue A1" in locations
        assert "Venue A2" in locations
        assert "Venue B1" not in locations
