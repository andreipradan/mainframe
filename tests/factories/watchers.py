import factory
from django.db.models import signals
from mainframe.watchers.models import Watcher


class BaseWatcherFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Watcher

    cron = "0 0 0 0 0"
    name = factory.Sequence(lambda n: f"name {n}")
    selector = ".foo-selector"


@factory.django.mute_signals(signals.post_save, signals.post_delete)
class WatcherFactory(BaseWatcherFactory):
    ...
