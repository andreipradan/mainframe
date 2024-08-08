import factory
from mainframe.exchange.models import Currency


class CurrencyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Currency

    name = "cname"
    symbol = factory.Sequence(str)
