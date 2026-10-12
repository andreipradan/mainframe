from unittest import mock

import pytest
from django.db import DatabaseError

from mainframe.events.models import Event
from mainframe.events.persistence import persist_events
from tests.factories.events import EventFactory
from tests.factories.source import SourceFactory


@pytest.mark.django_db
class TestPersistEvents:
    def test_persists_events_with_the_existing_upsert_fields(self):
        source = SourceFactory.create()
        event = EventFactory.build(
            source=source,
            location="Venue Alpha",
            url="https://example.com/event",
        )

        assert persist_events([event], source.name) == 1

        saved_event = Event.objects.get()
        assert saved_event.title == event.title
        assert saved_event.location == event.location

    def test_updates_events_matching_the_existing_unique_key(self):
        source = SourceFactory.create()
        original = EventFactory.build(
            source=source,
            title="Original title",
            location="Venue Alpha",
            url="https://example.com/event",
        )
        persist_events([original], source.name)

        updated = EventFactory.build(
            source=source,
            title="Updated title",
            location=original.location,
            start_date=original.start_date,
            url=original.url,
        )
        assert persist_events([updated], source.name) == 1

        assert Event.objects.count() == 1
        assert Event.objects.get().title == "Updated title"

    def test_propagates_database_errors(self):
        source = SourceFactory.build()
        event = EventFactory.build(source=source)

        with (
            mock.patch(
                "mainframe.events.persistence.Event.objects.bulk_create",
                side_effect=DatabaseError("write failed"),
            ),
            pytest.raises(DatabaseError, match="write failed"),
        ):
            persist_events([event], source.name)

    def test_skips_database_write_when_no_events_are_fetched(self):
        with mock.patch(
            "mainframe.events.persistence.Event.objects.bulk_create"
        ) as bulk_create:
            assert persist_events([], "Empty source") == 0

        bulk_create.assert_not_called()
