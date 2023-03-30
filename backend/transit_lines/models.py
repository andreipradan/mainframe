from django.contrib.postgres.fields import ArrayField
from django.db import models

from core.models import TimeStampedModel


class TransitLine(TimeStampedModel):
    TYPE_BUS = 1
    TYPE_MINIBUS = 2
    TYPE_TRAM = 3
    TYPE_TROLLEYBUS = 4

    name = models.CharField(max_length=16, unique=True)
    type = models.IntegerField(
        choices=(
            (TYPE_BUS, "Bus"),
            (TYPE_MINIBUS, "Minibus"),
            (TYPE_TRAM, "Tram"),
            (TYPE_TROLLEYBUS, "Trolleybus"),
        )
    )

    terminal1 = models.CharField(max_length=32)
    terminal2 = models.CharField(max_length=32)

    def __str__(self):
        return f"{self.name} ({self.terminal1} - {self.terminal2})"


class Schedule(TimeStampedModel):
    OCCURRENCE_LV = "lv"
    OCCURRENCE_S = "s"
    OCCURRENCE_D = "d"

    line = models.ForeignKey(
        to="TransitLine", on_delete=models.CASCADE, related_name="schedules"
    )
    occurrence = models.CharField(
        max_length=2,
        choices=(
            (OCCURRENCE_LV, "Monday - Friday"),
            (OCCURRENCE_S, "Saturday"),
            (OCCURRENCE_D, "Sunday"),
        ),
    )
    terminal1_schedule = ArrayField(models.CharField(max_length=5), default=list)
    terminal2_schedule = ArrayField(models.CharField(max_length=5), default=list)

    schedule_start_date = models.DateField(blank=True, null=True)

    class Meta:
        unique_together = ("line", "occurrence")

    def __str__(self):
        return f"{self.line} - {self.occurrence}"
