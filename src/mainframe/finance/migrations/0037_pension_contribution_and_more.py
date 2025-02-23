# Generated by Django 5.0.4 on 2025-01-10 19:05

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0036_cryptopnl_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Pension",
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
                (
                    "account_number",
                    models.CharField(blank=True, max_length=32, null=True),
                ),
                ("employer", models.CharField(blank=True, max_length=32, null=True)),
                ("name", models.CharField(max_length=100, unique=True)),
                ("number", models.PositiveIntegerField(blank=True, null=True)),
                ("start_date", models.DateField()),
                ("total_units", models.DecimalField(decimal_places=6, max_digits=13)),
            ],
            options={
                "abstract": False,
            },
        ),
        migrations.CreateModel(
            name="Contribution",
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
                ("date", models.DateTimeField()),
                (
                    "unit_value",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=8, null=True
                    ),
                ),
                (
                    "units",
                    models.DecimalField(
                        blank=True, decimal_places=6, max_digits=12, null=True
                    ),
                ),
                (
                    "pension",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="finance.pension",
                    ),
                ),
            ],
            options={
                "ordering": ("-date",),
            },
        ),
        migrations.AddConstraint(
            model_name="contribution",
            constraint=models.UniqueConstraint(
                fields=("date", "pension"),
                name="finance_contribution_date_pension_uniq",
            ),
        ),
    ]
