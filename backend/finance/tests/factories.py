import random

import factory
from environ import environ

from finance.models import Payment, Credit, Account


class AccountFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Account

    client_code = environ.Env()("DEFAULT_CREDIT_ACCOUNT_CLIENT_CODE")
    first_name = factory.Sequence(lambda n: "first-name-%s" % n)
    last_name = factory.Sequence(lambda n: "last-name-%s" % n)
    number = factory.Sequence(lambda n: n)


class CreditFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Credit

    account = factory.SubFactory("backend.finance.tests.factories.AccountFactory")
    currency = random.choice(["usd", "eur"])
    date = "2000-01-01"
    number = factory.Sequence(lambda n: n)
    number_of_months = factory.Sequence(lambda n: n)
    total = factory.Sequence(lambda n: n)


class PaymentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Payment

    credit = factory.SubFactory("backend.finance.tests.factories.CreditFactory")
    date = factory.Sequence(lambda x: f"2000-01-0{x+1:>1}")
    remaining = 0
