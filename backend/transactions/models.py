from django.db import models

from core.models import TimeStampedModel


def get_choices(items):
    return ((key, verbose) for key, verbose in enumerate(items))


class Transaction(TimeStampedModel):
    PRODUCT_CURRENT = 1
    PRODUCT_SAVINGS = 2

    TYPE_ATM = 1
    TYPE_CARD_CREDIT = 2
    TYPE_CARD_PAYMENT = 3
    TYPE_CARD_REFUND = 4
    TYPE_EXCHANGE = 5
    TYPE_FEE = 6
    TYPE_TOPUP = 7
    TYPE_TRANSFER = 8

    amount = models.DecimalField(decimal_places=2, max_digits=7)
    balance = models.DecimalField(decimal_places=2, max_digits=8)
    completed_at = models.DateTimeField(blank=True, null=True)
    currency = models.CharField(max_length=3)
    description = models.CharField(max_length=256, default="")
    fee = models.DecimalField(decimal_places=2, max_digits=6)
    product = models.IntegerField(
        choices=(
            (
                PRODUCT_CURRENT,
                "Current",
            ),
            (
                PRODUCT_SAVINGS,
                "Savings",
            ),
        ),
    )
    started_at = models.DateTimeField(blank=True, null=True)
    state = models.CharField(max_length=24)
    type = models.IntegerField(
        choices=(
            (
                TYPE_ATM,
                "ATM",
            ),
            (
                TYPE_CARD_CREDIT,
                "CARD_CREDIT",
            ),
            (
                TYPE_CARD_PAYMENT,
                "CARD_PAYMENT",
            ),
            (
                TYPE_CARD_REFUND,
                "CARD_REFUND",
            ),
            (
                TYPE_EXCHANGE,
                "EXCHANGE",
            ),
            (
                TYPE_FEE,
                "FEE",
            ),
            (
                TYPE_TOPUP,
                "TOPUP",
            ),
            (
                TYPE_TRANSFER,
                "TRANSFER",
            ),
        ),
    )

    class Meta:
        unique_together = ("amount", "currency", "type", "started_at")

    def __str__(self):
        return f"{self.started_at} - {self.get_type_display()} - {self.amount} {self.currency}"
