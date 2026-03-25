import factory
from django.utils import timezone

from mainframe.events.models import Event
from tests.factories.source import SourceFactory


class EventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Event

    title = factory.Sequence(lambda i: f"Event {i}")
    description = factory.Faker("sentence")
    start_date = factory.LazyFunction(timezone.now)
    source = factory.SubFactory(SourceFactory)
    external_id = factory.Sequence(lambda i: f"event-{i}")
