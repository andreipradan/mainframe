from django.contrib.postgres.fields import ArrayField
from django.db import models

from mainframe.core.models import TimeStampedModel


class TransitLine(TimeStampedModel):
    CAR_TYPE_BUS = 1
    CAR_TYPE_MINIBUS = 2
    CAR_TYPE_TRAM = 3
    CAR_TYPE_TROLLEYBUS = 4

    LINE_TYPE_METROPOLITAN = "metropolitan"
    LINE_TYPE_URBAN = "urban"
    LINE_TYPE_EXPRESS = "express"
    LINE_TYPE_CHOICES = (
        (LINE_TYPE_METROPOLITAN, "Metropolitan"),
        (LINE_TYPE_URBAN, "Urban"),
        (LINE_TYPE_EXPRESS, "Express"),
    )
    name = models.CharField(max_length=16, unique=True)
    line_type = models.CharField(choices=LINE_TYPE_CHOICES, max_length=16)
    car_type = models.IntegerField(
        choices=(
            (CAR_TYPE_BUS, "Bus"),
            (CAR_TYPE_MINIBUS, "Minibus"),
            (CAR_TYPE_TRAM, "Tram"),
            (CAR_TYPE_TROLLEYBUS, "Trolleybus"),
        )
    )
    has_bike_rack = models.BooleanField(default=False)

    terminal1 = models.CharField(max_length=32)
    terminal2 = models.CharField(max_length=32)
    favorite_of = ArrayField(models.CharField(max_length=32), default=list, blank=True)

    def __str__(self):
        return f"{self.name} ({self.terminal1} - {self.terminal2})"

    def save(self, *args, **kwargs):
        if self.favorite_of:
            self.favorite_of = sorted(set(self.favorite_of))
        return super().save(*args, **kwargs)

    def add_to_favorites(self, who):
        self.favorite_of.append(who)
        return self.save()

    def remove_from_favorites(self, who):
        self.favorite_of.remove(who)
        return self.save()


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
    terminal1_schedule = ArrayField(models.CharField(max_length=10), default=list)
    terminal2_schedule = ArrayField(models.CharField(max_length=10), default=list)

    schedule_start_date = models.DateField(blank=True, null=True)

    class Meta:
        unique_together = ("line", "occurrence")

    def __str__(self):
        return f"{self.line} - {self.occurrence}"
