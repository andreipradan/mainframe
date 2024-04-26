from django.db import models

from core.models import TimeStampedModel


class PnL(TimeStampedModel):
    amount = models.DecimalField(decimal_places=2, max_digits=7)
    cost_basis = models.DecimalField(decimal_places=2, max_digits=6)
    currency = models.CharField(max_length=3)
    date_acquired = models.DateField()
    date_sold = models.DateField()
    pnl = models.DecimalField(decimal_places=2, max_digits=7)
    quantity = models.DecimalField(decimal_places=8, max_digits=11)
    ticker = models.CharField(blank=True, max_length=5, null=True)

    class Meta:
        ordering = ["-date_sold", "-date_acquired", "ticker"]

    def __str__(self):
        return f"{self.ticker} {self.date_acquired} - {self.date_sold}"


class StockTransaction(TimeStampedModel):
    TYPE_BUY_MARKET = 1
    TYPE_CASH_TOP_UP = 2
    TYPE_CASH_WITHDRAWAL = 3
    TYPE_CUSTODY_FEE = 4
    TYPE_DIVIDEND = 5
    TYPE_OTHER = 6
    TYPE_SELL_MARKET = 7
    TYPE_STOCK_SPLIT = 8

    TYPE_CHOICES = (
        (TYPE_BUY_MARKET, "BUY - MARKET"),
        (TYPE_CASH_TOP_UP, "CASH TOP-UP"),
        (TYPE_CASH_WITHDRAWAL, "CASH WITHDRAWAL"),
        (TYPE_CUSTODY_FEE, "CUSTODY FEE"),
        (TYPE_DIVIDEND, "DIVIDEND"),
        (TYPE_OTHER, "OTHER"),
        (TYPE_SELL_MARKET, "SELL - MARKET"),
        (TYPE_STOCK_SPLIT, "STOCK SPLIT"),
    )

    date = models.DateTimeField()
    currency = models.CharField(max_length=3)
    fx_rate = models.DecimalField(decimal_places=4, max_digits=5)
    price_per_share = models.DecimalField(
        blank=True, decimal_places=2, max_digits=8, null=True
    )
    quantity = models.DecimalField(
        blank=True, decimal_places=8, max_digits=11, null=True
    )
    ticker = models.CharField(blank=True, max_length=5, null=True)
    total_amount = models.DecimalField(decimal_places=2, max_digits=8)
    type = models.IntegerField(choices=TYPE_CHOICES, default=TYPE_OTHER)

    class Meta:
        ordering = ("-date",)
        constraints = (
            models.UniqueConstraint(
                name="%(app_label)s_%(class)s_"
                "date_currency_fx_rate_total_amount_type_uniq",
                fields=("date", "currency", "fx_rate", "total_amount", "type"),
            ),
        )

    def __str__(self):
        return (
            f"{self.get_type_display()} {self.total_amount} "
            f"{self.currency} {self.ticker or ''}"
        )
