import factory
from django.db.models import signals
from mainframe.crons.models import Cron


class BaseCronFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Cron

    command = factory.Sequence(lambda n: f"cmd {n}")
    expression = "0 0 31 2 0"


@factory.django.mute_signals(signals.post_save, signals.post_delete)
class CronFactory(BaseCronFactory): ...
