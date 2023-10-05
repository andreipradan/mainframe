import datetime
import random

import factory
from django.conf import settings

from finance.models import Account, Category, Credit, Payment, Transaction


class AccountFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Account

    client_code = settings.DEFAULT_CREDIT_ACCOUNT_CLIENT_CODE
    first_name = factory.Sequence(lambda n: "first-name-%s" % n)
    last_name = factory.Sequence(lambda n: "last-name-%s" % n)
    number = factory.Sequence(lambda n: n)


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category

    id = factory.Sequence(lambda n: f"id-{n}")


class CreditFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Credit

    account = factory.SubFactory("tests.finance.factories.AccountFactory")
    currency = random.choice(["usd", "eur"])
    date = "2000-01-01"
    number = factory.Sequence(lambda n: n)
    number_of_months = factory.Sequence(lambda n: n)
    total = factory.Sequence(lambda n: n)


class PaymentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Payment

    credit = factory.SubFactory("tests.finance.factories.CreditFactory")
    date = factory.Sequence(lambda x: f"2000-01-0{x+1:>1}")
    remaining = 0


class TransactionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Transaction

    account = factory.SubFactory("tests.finance.factories.AccountFactory")
    amount = random.choice(range(100))
    category = factory.SubFactory("tests.finance.factories.CategoryFactory")
    currency = random.choice(["usd", "eur"])
    product = Transaction.PRODUCT_CURRENT
    started_at = datetime.datetime.now()
    state = "Pending"
