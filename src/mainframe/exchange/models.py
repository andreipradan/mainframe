from django.db import models

from mainframe.core.models import TimeStampedModel


class Currency(TimeStampedModel):
    name = models.CharField(blank=True, max_length=32)
    symbol = models.CharField(max_length=3, primary_key=True, unique=True)

    def save(self, **kwargs):
        self.symbol = self.symbol.upper()
        return super().save(**kwargs)


class ExchangeRate(TimeStampedModel):
    date = models.DateField()
    source = models.CharField(max_length=64)
    symbol = models.CharField(max_length=6)
    value = models.DecimalField(decimal_places=6, max_digits=13)

    class Meta:
        ordering = ("-date", "symbol")
        unique_together = "date", "source", "symbol"

    def __str__(self):
        return f"{self.date} - {self.symbol} - {self.value}"
