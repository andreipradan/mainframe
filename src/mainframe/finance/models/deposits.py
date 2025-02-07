from django.db import models

from mainframe.core.defaults import DECIMAL_DEFAULT_KWARGS
from mainframe.core.models import TimeStampedModel


class Deposit(TimeStampedModel):
    amount = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)
    currency = models.ForeignKey("exchange.Currency", on_delete=models.DO_NOTHING)
    date = models.DateField()
    interest = models.DecimalField(decimal_places=2, max_digits=5)
    maturity = models.DateField()
    name = models.CharField(max_length=65)

    alias = models.CharField(blank=True, max_length=128)
    pnl = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)
    tax = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)

    class Meta:
        ordering = ("-date",)
