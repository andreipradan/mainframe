import factory

from exchange.models import Currency


class CurrencyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Currency

    name = "cname"
    symbol = factory.Sequence(lambda i: str(i))
