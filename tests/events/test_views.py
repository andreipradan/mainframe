from datetime import datetime, timedelta, timezone

import pytest
from django.utils import timezone as django_timezone
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
        # Use local timezone boundaries for test setup
        local_now = django_timezone.localtime(django_timezone.now())
        today = local_now.date()

        # Create events relative to local today
        today_start_naive = datetime.combine(today, datetime.min.time())
        today_start_local = django_timezone.make_aware(today_start_naive)
        today_start_utc = today_start_local.astimezone(timezone.utc)

        yesterday_end_naive = datetime.combine(today, datetime.min.time()) - timedelta(
            hours=1
        )
        yesterday_end_local = django_timezone.make_aware(yesterday_end_naive)
        yesterday_end_utc = yesterday_end_local.astimezone(timezone.utc)

        EventFactory(
            title="Started Today",
            start_date=today_start_utc + timedelta(hours=2),
            end_date=None,
        )
        EventFactory(
            title="Ongoing Event",
            start_date=today_start_utc - timedelta(days=2),
            end_date=today_start_utc + timedelta(days=1),
        )
        EventFactory(
            title="Ended Yesterday",
            start_date=today_start_utc - timedelta(days=3),
            end_date=yesterday_end_utc,  # Ends before local today starts
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

    def test_weekend_mode_filter(self, client, staff_session):
        """Test weekend filter returns events from upcoming/current weekend"""
        now = django_timezone.now()
        local_now = django_timezone.localtime(now)
        today = local_now.date()
        weekday = today.weekday()  # 0 is Monday, 6 is Sunday

        # Calculate when the weekend starts for test expectations
        if weekday < 5:  # Mon-Fri
            days_to_sat = 5 - weekday
            sat_date = today + timedelta(days=days_to_sat)
            sun_date = sat_date + timedelta(days=1)
        elif weekday == 5:  # Saturday
            sat_date = today
            sun_date = today + timedelta(days=1)
        else:  # Sunday
            sat_date = today
            sun_date = today

        # Create test events
        sat_start = django_timezone.make_aware(
            datetime.combine(sat_date, datetime.min.time())
        ).astimezone(timezone.utc)
        sun_start = django_timezone.make_aware(
            datetime.combine(sun_date, datetime.min.time())
        ).astimezone(timezone.utc)
        weekday_before = django_timezone.make_aware(
            datetime.combine(
                today - timedelta(days=max(1, weekday + 1)), datetime.min.time()
            )
        ).astimezone(timezone.utc)

        EventFactory(
            title="Weekday Event",
            start_date=weekday_before,
            end_date=None,
        )
        EventFactory(
            title="Saturday Event",
            start_date=sat_start + timedelta(hours=10),
            end_date=None,
        )
        EventFactory(
            title="Sunday Event",
            start_date=sun_start + timedelta(hours=14),
            end_date=None,
        )

        # Test weekend filter
        weekend_response = client.get(
            "/events/?today_mode=weekend",
            HTTP_AUTHORIZATION=staff_session.token,
        )
        assert weekend_response.status_code == status.HTTP_200_OK
        weekend_titles = {item["title"] for item in weekend_response.data["results"]}
        assert "Saturday Event" in weekend_titles
        assert "Sunday Event" in weekend_titles
        assert "Weekday Event" not in weekend_titles
