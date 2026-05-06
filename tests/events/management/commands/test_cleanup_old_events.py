from datetime import datetime, timedelta
from datetime import timezone as std_timezone

import pytest
from django.core.management import call_command
from django.utils import timezone

from mainframe.events.models import Event
from tests.factories.events import EventFactory


@pytest.mark.django_db
class TestCleanupOldEventsCommand:
    def test_deletes_only_fully_ended_events(self):
        now = timezone.now()
        today_start = timezone.localtime(now).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        today_start_utc = timezone.make_aware(
            datetime.combine(today_start.date(), datetime.min.time())
        ).astimezone(std_timezone.utc)

        EventFactory(
            title="Ended Event",
            start_date=now - timedelta(days=3),
            end_date=now - timedelta(days=1),
        )
        EventFactory(
            title="Ongoing Event",
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=1),
        )
        EventFactory(
            title="Open-ended Today Event",
            start_date=today_start_utc + timedelta(hours=2),
            end_date=None,
        )
        EventFactory(
            title="Open-ended Yesterday Event",
            start_date=today_start_utc - timedelta(days=1),
            end_date=None,
        )

        call_command("cleanup_old_events")

        remaining_titles = set(Event.objects.values_list("title", flat=True))
        assert "Ended Event" not in remaining_titles
        assert "Ongoing Event" in remaining_titles
        assert "Open-ended Today Event" in remaining_titles
        assert "Open-ended Yesterday Event" not in remaining_titles
