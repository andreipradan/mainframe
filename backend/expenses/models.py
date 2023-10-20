from django.db import models

from core.models import TimeStampedModel
from finance.models import DECIMAL_DEFAULT_KWARGS


class Expense(TimeStampedModel):
    payer = models.ForeignKey(
        "api_user.User",
        blank=True,
        on_delete=models.SET_NULL,
        null=True,
    )
    amount = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)
    currency = models.CharField(max_length=3)
    date = models.DateField()
    description = models.CharField(max_length=256, default="")
    group = models.ForeignKey(
        "expenses.ExpenseGroup",
        blank=True,
        on_delete=models.SET_NULL,
        null=True,
    )

    class Meta:
        ordering = ("-date",)


class ExpenseGroup(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    users = models.ManyToManyField(
        "api_user.User",
        blank=True,
        related_name="expense_groups",
    )
    created_by = models.ForeignKey(
        "api_user.User",
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
    )
