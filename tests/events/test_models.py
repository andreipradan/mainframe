import pytest

from tests.factories.events import EventFactory


@pytest.mark.django_db
class TestEvent:
    def test_event_creation(self):
        event = EventFactory()
        assert event.title.startswith("Event")
        assert event.external_id.startswith("event-")
        assert str(event) == event.title
