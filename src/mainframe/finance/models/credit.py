from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from mainframe.core.defaults import DECIMAL_DEFAULT_KWARGS
from mainframe.core.models import TimeStampedModel

NULLABLE_KWARGS = {"blank": True, "null": True}


def get_default_credit():
    if not (code := settings.DEFAULT_CREDIT_ACCOUNT_CLIENT_CODE):
        raise ValidationError("DEFAULT_CREDIT_ACCOUNT_CLIENT_CODE is not set")
    return Credit.objects.select_related("account", "currency").get(
        account__client_code=code
    )


def validate_amortization_table(value):
    if isinstance(value, list):
        raise ValidationError("amortization_table must be a list")

    month_fields = {"date", "insurance", "interest", "principal", "remaining", "total"}
    if not all(set(month) == month_fields for month in value):
        raise ValidationError(
            "amortization_table contains items that do not have "
            f"these exact keys: {month_fields}"
        )


class Account(TimeStampedModel):
    TYPE_CURRENT = "Current"
    TYPE_DEPOSIT = "Deposit"
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
            (TYPE_DEPOSIT, TYPE_DEPOSIT),
            (TYPE_SAVINGS, TYPE_SAVINGS),
        ),
        default=TYPE_CURRENT,
        max_length=7,
    )

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self):
        return (
            f"[{self.bank[:7]} - {self.type}] "
            f"{self.first_name} {self.last_name} ({self.number})"
        )


class Credit(TimeStampedModel):
    account = models.ForeignKey(on_delete=models.CASCADE, to="finance.Account")
    currency = models.ForeignKey("exchange.Currency", on_delete=models.DO_NOTHING)
    date = models.DateField()
    number = models.IntegerField(unique=True)
    number_of_months = models.IntegerField()
    total = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)

    def __str__(self):
        return f"{self.total} {self.currency}"

    @property
    def latest_timetable(self):
        return self.timetable_set.order_by("-date", "-created_at").first()


class Payment(TimeStampedModel):
    credit = models.ForeignKey(
        default=get_default_credit,
        on_delete=models.CASCADE,
        to="finance.Credit",
    )
    additional_data = models.JSONField(blank=True, default=dict, null=True)
    date = models.DateField()
    interest = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)
    is_prepayment = models.BooleanField(default=False)
    principal = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)
    remaining = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)
    reference = models.IntegerField(**NULLABLE_KWARGS)
    saved = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)
    total = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)

    class Meta:
        ordering = ("-date", "-remaining")
        constraints = (
            models.UniqueConstraint(
                name="%(app_label)s_%(class)s_credit_date_"
                "is_prepayment_reference_total_uniq",
                fields=("credit", "date", "is_prepayment", "reference", "total"),
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
    amortization_table = models.JSONField(validators=[validate_amortization_table])
    credit = models.ForeignKey(on_delete=models.CASCADE, to="finance.Credit")
    date = models.DateField()
    interest = models.DecimalField(default=0, **DECIMAL_DEFAULT_KWARGS)
    ircc = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)
    margin = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)

    class Meta:
        ordering = ("-date", "-created_at")

    @property
    def number_of_months(self):
        return len(self.amortization_table)

    def __str__(self):
        return f"{self.date} | {self.interest}% ({self.ircc}% IRCC + {self.margin}%)"
