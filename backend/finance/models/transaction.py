from django.db import models

from core.models import TimeStampedModel
from finance.models import DECIMAL_DEFAULT_KWARGS, NULLABLE_KWARGS


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
    TYPE_UNIDENTIFIED = "UNIDENTIFIED"

    account = models.ForeignKey("finance.Account", on_delete=models.CASCADE)
    amount = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)
    balance = models.DecimalField(**DECIMAL_DEFAULT_KWARGS, **NULLABLE_KWARGS)
    completed_at = models.DateTimeField(**NULLABLE_KWARGS)
    currency = models.CharField(max_length=3)
    description = models.CharField(max_length=256, default="")
    fee = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)
    product = models.CharField(
        choices=(
            (PRODUCT_CURRENT, PRODUCT_CURRENT),
            (PRODUCT_SAVINGS, PRODUCT_SAVINGS),
        ),
        default=PRODUCT_CURRENT,
        max_length=7,
    )
    started_at = models.DateTimeField(**NULLABLE_KWARGS)
    state = models.CharField(max_length=24)
    type = models.CharField(
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
            (TYPE_UNIDENTIFIED, TYPE_UNIDENTIFIED.capitalize()),
        ),
        default=TYPE_UNIDENTIFIED,
        max_length=15,
    )

    class Meta:
        ordering = ["-started_at"]
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
