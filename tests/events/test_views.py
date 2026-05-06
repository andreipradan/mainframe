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

        strict_response = client.get(
            "/events/?period_filter=today",
            HTTP_AUTHORIZATION=staff_session.token,
        )
        assert strict_response.status_code == status.HTTP_200_OK
        assert strict_response.data["count"] == 1
        assert strict_response.data["results"][0]["title"] == "Started Today"

        ongoing_response = client.get(
            "/events/?period_filter=today&include_ongoing=true",
            HTTP_AUTHORIZATION=staff_session.token,
        )
        assert ongoing_response.status_code == status.HTTP_200_OK
        assert ongoing_response.data["count"] == 2
        assert {item["title"] for item in ongoing_response.data["results"]} == {
            "Started Today",
            "Ongoing Event",
        }

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
        if weekday < 4:  # Mon-Thu
            days_to_fri = 4 - weekday
            fri_date = today + timedelta(days=days_to_fri)
            sat_date = fri_date + timedelta(days=1)
            sun_date = sat_date + timedelta(days=1)
        elif weekday == 4:  # Friday
            fri_date = today
            sat_date = today + timedelta(days=1)
            sun_date = sat_date + timedelta(days=1)
        elif weekday == 5:  # Saturday
            fri_date = today - timedelta(days=1)
            sat_date = today
            sun_date = today + timedelta(days=1)
        else:  # Sunday
            fri_date = today - timedelta(days=2)
            sat_date = today - timedelta(days=1)
            sun_date = today

        # Create test events
        fri_start = django_timezone.make_aware(
            datetime.combine(fri_date, datetime.min.time())
        ).astimezone(timezone.utc)
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
            title="Friday Event",
            start_date=fri_start + timedelta(hours=14),
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

        # Test strict weekend filter
        strict_weekend_response = client.get(
            "/events/?period_filter=weekend",
            HTTP_AUTHORIZATION=staff_session.token,
        )
        assert strict_weekend_response.status_code == status.HTTP_200_OK
        strict_weekend_titles = {
            item["title"] for item in strict_weekend_response.data["results"]
        }
        assert "Friday Event" in strict_weekend_titles
        assert "Saturday Event" in strict_weekend_titles
        assert "Sunday Event" in strict_weekend_titles
        assert "Weekday Event" not in strict_weekend_titles

        # Test strict weekend filter with ongoing events included
        ongoing_weekend_response = client.get(
            "/events/?period_filter=strict_weekend&include_ongoing=true",
            HTTP_AUTHORIZATION=staff_session.token,
        )
        assert ongoing_weekend_response.status_code == status.HTTP_200_OK
        ongoing_weekend_titles = {
            item["title"] for item in ongoing_weekend_response.data["results"]
        }
        assert "Friday Event" in ongoing_weekend_titles
        assert "Saturday Event" in ongoing_weekend_titles
        assert "Sunday Event" in ongoing_weekend_titles
        assert "Weekday Event" in ongoing_weekend_titles
