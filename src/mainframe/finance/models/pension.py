from django.db import models

from mainframe.core.models import TimeStampedModel
from mainframe.finance.models import DECIMAL_DEFAULT_KWARGS


class Pension(TimeStampedModel):
    account_number = models.CharField(default="", max_length=32)
    employer = models.CharField(default="", max_length=32)
    name = models.CharField(max_length=100, unique=True)
    number = models.PositiveIntegerField(blank=True, null=True)
    start_date = models.DateField()
    total_units = models.DecimalField(decimal_places=6, default=0, max_digits=13)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class Contribution(TimeStampedModel):
    pension = models.ForeignKey(Pension, on_delete=models.CASCADE)

    amount = models.DecimalField(**DECIMAL_DEFAULT_KWARGS)
    currency = models.CharField(max_length=3, blank=True, default="RON")
    date = models.DateField()
    units = models.DecimalField(max_digits=12, decimal_places=6, default=0)

    class Meta:
        ordering = ("-date",)
        constraints = (
            models.UniqueConstraint(
                name="%(app_label)s_%(class)s_date_pension_uniq",
                fields=("date", "pension"),
            ),
        )

    def __str__(self):
        return f"{self.pension} - {self.amount} {self.currency}"


class UnitValue(TimeStampedModel):
    pension = models.ForeignKey(Pension, on_delete=models.CASCADE)

    currency = models.CharField(max_length=3, blank=True, default="RON")
    date = models.DateField()
    value = models.DecimalField(max_digits=12, decimal_places=6, default=0)

    class Meta:
        ordering = ("-date",)
        constraints = (
            models.UniqueConstraint(
                name="%(app_label)s_%(class)s_date_pension_uniq",
                fields=("date", "pension"),
            ),
        )
