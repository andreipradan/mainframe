# Generated by Django 4.1.6 on 2023-08-07 14:25

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("finance", "0010_account_currency"),
    ]

    operations = [
        migrations.CreateModel(
            name="RaiffeisenTransaction",
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
                (
                    "balance",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=8, null=True
                    ),
                ),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("currency", models.CharField(max_length=3)),
                ("description", models.CharField(default="", max_length=256)),
                ("fee", models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                (
                    "product",
                    models.CharField(
                        choices=[("Current", "Current"), ("Savings", "Savings")],
                        default="Current",
                        max_length=7,
                    ),
                ),
                ("started_at", models.DateTimeField()),
                ("state", models.CharField(max_length=24)),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("ATM", "ATM"),
                            ("CARD_CHARGEBACK", "Card chargeback"),
                            ("CARD_CREDIT", "Card credit"),
                            ("CARD_PAYMENT", "Card payment"),
                            ("CARD_REFUND", "Card refund"),
                            ("CASHBACK", "Cashback"),
                            ("EXCHANGE", "Exchange"),
                            ("FEE", "Fee"),
                            ("TOPUP", "Topup"),
                            ("TRANSFER", "Transfer"),
                            ("UNIDENTIFIED", "Unidentified"),
                        ],
                        default="UNIDENTIFIED",
                        max_length=15,
                    ),
                ),
                (
                    "account",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="finance.account",
                    ),
                ),
            ],
            options={
                "ordering": ["-completed_at", "-started_at"],
            },
        ),
    ]