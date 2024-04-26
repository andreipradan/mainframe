import factory

from watchers.models import Watcher


class WatcherFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Watcher

    selector = ".foo-selector"
