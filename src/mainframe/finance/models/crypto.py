from django.db import models
from mainframe.core.models import TimeStampedModel


class CryptoTransaction(TimeStampedModel):
    TYPE_BUY = 1
    TYPE_SELL = 2
    TYPE_SEND = 3
    TYPE_RECEIVE = 4
    TYPE_PAYMENT = 5
    TYPE_STAKE = 6
    TYPE_UNSTAKE = 7
    TYPE_LEARN_REWARD = 8
    TYPE_STAKING_REWARD = 9

    TYPE_CHOICES = (
        (TYPE_BUY, "Buy"),
        (TYPE_SELL, "Sell"),
        (TYPE_SEND, "Send"),
        (TYPE_RECEIVE, "Receive"),
        (TYPE_PAYMENT, "Payment"),
        (TYPE_STAKE, "Stake"),
        (TYPE_UNSTAKE, "Unstake"),
        (TYPE_LEARN_REWARD, "Learn reward"),
        (TYPE_STAKING_REWARD, "Staking reward"),
    )

    currency = models.CharField(max_length=3, blank=True)
    date = models.DateTimeField()
    fees = models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)
    price = models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)
    quantity = models.DecimalField(
        blank=True, decimal_places=8, max_digits=18, null=True
    )
    symbol = models.CharField(blank=True, max_length=10)
    type = models.IntegerField(choices=TYPE_CHOICES, default=TYPE_SELL)
    value = models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)

    class Meta:
        ordering = ("-date",)
        constraints = (
            models.UniqueConstraint(
                name="%(app_label)s_%(class)s_" "date_quantity_symbol_type_uniq",
                fields=("date", "quantity", "symbol", "type"),
            ),
        )

    def __str__(self):
        return (
            f"{self.get_type_display()} {self.value} "
            f"{self.currency} {self.symbol or ''}"
        )