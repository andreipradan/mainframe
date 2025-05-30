# Generated by Django 5.0.4 on 2025-01-10 23:46

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0043_pension_url"),
    ]

    operations = [
        migrations.CreateModel(
            name="UnitValue",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=8)),
                ("currency", models.CharField(blank=True, default="RON", max_length=3)),
                ("date", models.DateField()),
                (
                    "pension",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="finance.pension",
                    ),
                ),
            ],
            options={
                "abstract": False,
            },
        ),
    ]
