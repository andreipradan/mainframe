import factory
from django.utils import timezone

from mainframe.events.models import Event
from tests.factories.source import SourceFactory


class EventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Event

    title = factory.Sequence(lambda i: f"Event {i}")
    description = factory.Sequence(lambda i: f"Description {i}")
    start_date = factory.LazyFunction(timezone.now)
    source = factory.SubFactory(SourceFactory)
    external_id = factory.Sequence(lambda i: f"event-{i}")
    category_id = 4  # "Other"
    location = factory.Sequence(lambda i: f"Venue {i}")
    city_name = factory.Sequence(lambda i: f"City {i}")
    url = factory.Sequence(lambda i: f"https://example.com/event-{i}")
