from django.contrib.postgres.fields import ArrayField
from django.db import models

from core.models import TimeStampedModel


class Meal(TimeStampedModel):
    TYPE_BREAKFAST = "breakfast"
    TYPE_DINNER = "dinner"
    TYPE_LUNCH = "lunch"
    TYPE_SNACK_1 = "snack_1"
    TYPE_SNACK_2 = "snack_2"

    name = models.TextField()
    ingredients = ArrayField(models.CharField(max_length=24), default=list)
    nutritional_values = models.JSONField(default=dict)
    quantities = models.JSONField(default=dict)
    type = models.CharField(
        max_length=10,
        choices=(
            (TYPE_BREAKFAST, "Breakfast"),
            (TYPE_SNACK_1, "Snack #1"),
            (TYPE_LUNCH, "Lunch"),
            (TYPE_SNACK_2, "Snack #2"),
            (TYPE_DINNER, "Dinner"),
        ),
    )

    date = models.DateField()

    class Meta:
        unique_together = ("date", "type")

    def __str__(self):
        return f"{self.get_type_display()} - {self.date} - {self.name}"
