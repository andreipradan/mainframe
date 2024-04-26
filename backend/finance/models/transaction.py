from django.db import models

from core.models import TimeStampedModel
from finance.models import DECIMAL_DEFAULT_KWARGS, NULLABLE_KWARGS


class Category(TimeStampedModel):
    UNIDENTIFIED = "Unidentified"
    id = models.CharField(max_length=20, primary_key=True, default=UNIDENTIFIED)

    @property
    def verbose(self):
        return self.id.replace("-", " ").capitalize()

    def save(self, *args, **kwargs):
        self.id = self.id.replace(" ", "-").lower()
        return super().save(*args, **kwargs)


class TransactionQuerySet(models.QuerySet):
    def expenses(self):
        return self.filter(amount__lt=0)


class Transaction(TimeStampedModel):
    CONFIRMED_BY_UNCONFIRMED = 0
    CONFIRMED_BY_HUMAN = 1
    CONFIRMED_BY_ML = 2

    CONFIRMED_BY_CHOICES = (
        (CONFIRMED_BY_UNCONFIRMED, "Unconfirmed"),
        (CONFIRMED_BY_HUMAN, "Human"),
        (CONFIRMED_BY_ML, "ML"),
    )

    PRODUCT_CURRENT = "Current"
    PRODUCT_SAVINGS = "Savings"
    PRODUCT_INVESTMENTS = "Investments"

    PRODUCT_CHOICES = (
        (PRODUCT_CURRENT, PRODUCT_CURRENT),
        (PRODUCT_SAVINGS, PRODUCT_SAVINGS),
        (PRODUCT_INVESTMENTS, PRODUCT_INVESTMENTS),
    )

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

    TYPE_CHOICES = (
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
    )

    account = models.ForeignKey("finance.Account", on_delete=models.CASCADE)
    additional_data = models.JSONField(blank=True, default=dict, null=True)
    amount = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)
    balance = models.DecimalField(**DECIMAL_DEFAULT_KWARGS, **NULLABLE_KWARGS)
    category = models.ForeignKey(
        "finance.Category",
        on_delete=models.SET_DEFAULT,
        default=Category.UNIDENTIFIED,
    )
    category_suggestion = models.ForeignKey(
        "finance.Category",
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="suggestions",
    )
    completed_at = models.DateTimeField(**NULLABLE_KWARGS)
    confirmed_by = models.SmallIntegerField(
        choices=CONFIRMED_BY_CHOICES,
        default=CONFIRMED_BY_UNCONFIRMED,
    )
    currency = models.CharField(max_length=3)
    description = models.CharField(max_length=256, default="")
    fee = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)
    product = models.CharField(
        choices=PRODUCT_CHOICES,
        default=PRODUCT_CURRENT,
        max_length=11,
    )
    started_at = models.DateTimeField()
    state = models.CharField(max_length=24)
    type = models.CharField(
        choices=TYPE_CHOICES,
        default=TYPE_UNIDENTIFIED,
        max_length=15,
    )

    objects = TransactionQuerySet.as_manager()

    class Meta:
        ordering = ["-completed_at"]

    def __str__(self):
        return (
            f"{self.started_at} - {self.get_type_display()} - "
            f"{self.amount} {self.currency}"
        )
