import factory

from mainframe.sources.models import Source


class SourceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Source

    name = factory.Sequence(lambda n: f"Source {n}")
    url = factory.Sequence(lambda n: f"https://api.source{n}.example.com")
