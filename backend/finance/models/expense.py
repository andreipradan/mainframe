from django.db import models

from core.models import TimeStampedModel
from finance.models import DECIMAL_DEFAULT_KWARGS


class Expense(TimeStampedModel):
    payer = models.ForeignKey(
        "api.user.User",
        blank=True,
        on_delete=models.SET_NULL,
        null=True,
    )
    amount = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)
    currency = models.CharField(max_length=3)
    date = models.DateField()
    description = models.CharField(max_length=256, default="")
    group = models.ForeignKey(
        "auth.Group",
        blank=True,
        on_delete=models.SET_NULL,
        null=True,
    )

    class Meta:
        ordering = ("-date",)
