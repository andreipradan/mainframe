from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from core.models import TimeStampedModel

DECIMAL_DEFAULT_KWARGS = {"decimal_places": 2, "max_digits": 8}
NULLABLE_KWARGS = {"blank": True, "null": True}


def get_default_credit():
    code = settings.DEFAULT_CREDIT_ACCOUNT_CLIENT_CODE
    return Credit.objects.select_related("account").get(
        account__client_code=code)


def validate_amortization_table(value):
    if isinstance(value, list):
        raise ValidationError("amortization_table must be a list")

    month_fields = {
        "date", "insurance", "interest", "principal", "remaining", "total"
    }
    if not all(set(month) == month_fields for month in value):
        raise ValidationError(
            "amortization_table contains items that do not have "
            f"these exact keys: {month_fields}")


class Account(TimeStampedModel):
    TYPE_CURRENT = "Current"
    TYPE_SAVINGS = "Savings"

    bank = models.CharField(max_length=32)
    client_code = models.IntegerField()
    currency = models.CharField(max_length=3)
    first_name = models.CharField(max_length=32)
    last_name = models.CharField(max_length=32)
    number = models.CharField(max_length=32)
    type = models.CharField(
        choices=(
            (TYPE_CURRENT, TYPE_CURRENT),
            (TYPE_SAVINGS, TYPE_SAVINGS),
        ),
        default=TYPE_CURRENT,
        max_length=7,
    )

    class Meta:
        ordering = ("-updated_at", )

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.number})"


class Credit(TimeStampedModel):
    account = models.ForeignKey(on_delete=models.CASCADE, to="finance.Account")
    currency = models.CharField(max_length=3)
    date = models.DateField()
    number = models.IntegerField(unique=True)
    number_of_months = models.IntegerField()
    total = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)

    def __str__(self):
        return f"{self.total} {self.currency}"

    @property
    def latest_timetable(self):
        return self.timetable_set.order_by("-date").first()


class ExchangeRate(TimeStampedModel):
    date = models.DateField()
    source = models.CharField(max_length=64)
    symbol = models.CharField(max_length=6)
    value = models.DecimalField(decimal_places=4, max_digits=10)

    class Meta:
        ordering = ("-date", "symbol")
        unique_together = "date", "source", "symbol"


class Payment(TimeStampedModel):
    credit = models.ForeignKey(
        default=get_default_credit,
        on_delete=models.CASCADE,
        to="finance.Credit",
    )
    date = models.DateField()
    interest = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)
    is_prepayment = models.BooleanField(default=False)
    principal = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)
    remaining = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)
    reference = models.IntegerField(**NULLABLE_KWARGS)
    saved = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)
    total = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)

    class Meta:
        ordering = ("-date", )
        constraints = (
            models.UniqueConstraint(
                name="%(app_label)s_%(class)s_credit_date_is_prepayment_reference_total_uniq",
                fields=("credit", "date", "is_prepayment", "reference",
                        "total"),
            ),
            models.UniqueConstraint(
                name="%(app_label)s_%(class)s_credit_date_is_prepayment_total_uniq",
                fields=("credit", "date", "is_prepayment", "total"),
                condition=Q(reference__isnull=True),
            ),
        )

    def __str__(self):
        return f"{self.total}{' (prepayment)' if self.is_prepayment else ''}"


class Timetable(TimeStampedModel):
    amortization_table = models.JSONField(
        validators=[validate_amortization_table])
    credit = models.ForeignKey(on_delete=models.CASCADE, to="finance.Credit")
    date = models.DateField()
    ircc = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)
    margin = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)

    class Meta:
        ordering = ("-date", )

    @property
    def interest(self):
        return self.margin + self.ircc

    @property
    def number_of_months(self):
        return len(self.amortization_table)

    def __str__(self):
        return f"{self.date} | {self.interest}% ({self.ircc}% IRCC + {self.margin}%)"
