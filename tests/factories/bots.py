import factory
from mainframe.bots.models import Bot


class BotFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Bot

    telegram_id = factory.Sequence(lambda n: n)
