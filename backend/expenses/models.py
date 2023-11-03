from django.db import models

from core.models import TimeStampedModel
from finance.models import DECIMAL_DEFAULT_KWARGS


class Debt(models.Model):
    amount = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)
    currency = models.CharField(max_length=3)
    expense = models.ForeignKey(
        "expenses.Expense",
        on_delete=models.CASCADE,
        related_name="debts",
    )
    user = models.ForeignKey(
        "api_user.User",
        on_delete=models.DO_NOTHING,
        related_name="debts",
    )


class Expense(TimeStampedModel):
    payer = models.ForeignKey("api_user.User", on_delete=models.DO_NOTHING)
    amount = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)
    currency = models.CharField(max_length=3)
    date = models.DateField()
    description = models.CharField(max_length=256, default="")

    class Meta:
        ordering = ("-date",)


class ExpenseGroup(TimeStampedModel):
    created_by = models.ForeignKey(
        "api_user.User", on_delete=models.DO_NOTHING, related_name="created_groups"
    )
    name = models.CharField(max_length=100, unique=True)
    users = models.ManyToManyField(
        "api_user.User",
        blank=True,
        related_name="expense_groups",
    )
