from django.db import models

from mainframe.core.defaults import DECIMAL_DEFAULT_KWARGS
from mainframe.core.models import TimeStampedModel


class Bond(TimeStampedModel):
    TYPE_BUY = "cump"
    TYPE_DEPOSIT = "in"
    TYPE_DIVIDEND = "div"
    TYPE_SELL = "vanz"
    TYPE_WITHDRAWAL = "out"

    TYPE_CHOICES = (
        (TYPE_BUY, "Buy"),
        (TYPE_DEPOSIT, "Deposit"),
        (TYPE_DIVIDEND, "Dividend"),
        (TYPE_SELL, "Sell"),
        (TYPE_WITHDRAWAL, "Withdrawal"),
    )

    commission = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)
    currency = models.ForeignKey("exchange.Currency", on_delete=models.DO_NOTHING)
    date = models.DateTimeField()
    interest = models.DecimalField(
        blank=True, decimal_places=2, max_digits=5, null=True
    )
    quantity = models.DecimalField(decimal_places=2, max_digits=15)
    maturity = models.DateField(blank=True, null=True)
    net = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)
    notes = models.CharField(blank=True, max_length=128)
    pnl = models.DecimalField(blank=True, null=True, **DECIMAL_DEFAULT_KWARGS)
    price = models.DecimalField(blank=True, null=True, **DECIMAL_DEFAULT_KWARGS)
    tax = models.DecimalField(blank=True, null=True, **DECIMAL_DEFAULT_KWARGS)
    ticker = models.CharField(max_length=10)
    type = models.CharField(choices=TYPE_CHOICES, max_length=7)

    class Meta:
        ordering = ("-date",)
