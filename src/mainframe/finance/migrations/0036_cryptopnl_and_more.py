# Generated by Django 5.0.4 on 2025-01-06 20:12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0035_timetable_interest"),
    ]

    operations = [
        migrations.CreateModel(
            name="CryptoPnL",
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
                ("amount", models.DecimalField(decimal_places=2, max_digits=7)),
                ("cost_basis", models.DecimalField(decimal_places=2, max_digits=6)),
                ("currency", models.CharField(max_length=3)),
                ("date_acquired", models.DateField()),
                ("date_sold", models.DateField()),
                (
                    "fees",
                    models.DecimalField(decimal_places=2, default=0, max_digits=7),
                ),
                ("gross_pnl", models.DecimalField(decimal_places=2, max_digits=7)),
                ("net_pnl", models.DecimalField(decimal_places=2, max_digits=7)),
                ("quantity", models.DecimalField(decimal_places=8, max_digits=15)),
                (
                    "ticker",
                    models.CharField(blank=True, help_text="Symbol", max_length=10),
                ),
            ],
            options={
                "ordering": ["-date_sold", "-date_acquired", "ticker"],
            },
        ),
        migrations.AddConstraint(
            model_name="cryptopnl",
            constraint=models.UniqueConstraint(
                fields=("date_acquired", "date_sold", "ticker", "quantity", "currency"),
                name="finance_cryptopnl_date_acquired_date_sold_ticker_quantity_currency_uniq",
            ),
        ),
    ]
