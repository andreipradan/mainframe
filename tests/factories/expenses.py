import random

import factory
from mainframe.expenses.models import Debt, Expense


class DebtFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Debt

    amount = random.randint(1, 100)  # noqa S311
    currency = "USD"
    expense = factory.SubFactory("tests.expenses.factories.ExpenseFactory")
    to = factory.SubFactory("tests.api.factories.UserFactory")
    user = factory.SubFactory("tests.api.factories.UserFactory")


class ExpenseFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Expense

    amount = random.randint(1, 100)  # noqa S311
    currency = "USD"
    date = "2000-01-02"
    payer = factory.SubFactory("tests.api.factories.UserFactory")
