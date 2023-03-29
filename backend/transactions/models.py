from django.db import models

from core.models import TimeStampedModel


def get_choices(items):
    return ((key, verbose) for key, verbose in enumerate(items))


class Transaction(TimeStampedModel):
    PRODUCT_CURRENT = "Current"
    PRODUCT_SAVINGS = "Savings"

    TYPE_ATM = "ATM"
    TYPE_CARD_CHARGEBACK = "CARD_CHARGEBACK"
    TYPE_CARD_CREDIT = "CARD_CREDIT"
    TYPE_CARD_PAYMENT = "CARD_PAYMENT"
    TYPE_CARD_REFUND = "CARD_REFUND"
    TYPE_CASHBACK = "CASHBACK"
    TYPE_EXCHANGE = "EXCHANGE"
    TYPE_FEE = "FEE"
    TYPE_TOPUP = "TOPUP"
    TYPE_TRANSFER = "TRANSFER"

    amount = models.DecimalField(decimal_places=2, max_digits=7)
    balance = models.DecimalField(decimal_places=2, max_digits=8, null=True, blank=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    currency = models.CharField(max_length=3)
    description = models.CharField(max_length=256, default="")
    fee = models.DecimalField(decimal_places=2, max_digits=6)
    product = models.CharField(
        max_length=7,
        choices=(
            (PRODUCT_CURRENT, PRODUCT_CURRENT),
            (PRODUCT_SAVINGS, PRODUCT_SAVINGS),
        ),
    )
    started_at = models.DateTimeField(blank=True, null=True)
    state = models.CharField(max_length=24)
    type = models.CharField(
        max_length=15,
        choices=(
            (TYPE_ATM, TYPE_ATM),
            (TYPE_CARD_CHARGEBACK, "Card chargeback"),
            (TYPE_CARD_CREDIT, "Card credit"),
            (TYPE_CARD_PAYMENT, "Card payment"),
            (TYPE_CARD_REFUND, "Card refund"),
            (TYPE_CASHBACK, "Cashback"),
            (TYPE_EXCHANGE, TYPE_EXCHANGE.capitalize()),
            (TYPE_FEE, TYPE_FEE.capitalize()),
            (TYPE_TOPUP, TYPE_TOPUP.capitalize()),
            (TYPE_TRANSFER, TYPE_TRANSFER.capitalize()),
        ),
    )

    class Meta:
        unique_together = (
            "amount",
            "currency",
            "description",
            "type",
            "started_at",
            "balance",
        )

    def __str__(self):
        return f"{self.started_at} - {self.get_type_display()} - {self.amount} {self.currency}"
