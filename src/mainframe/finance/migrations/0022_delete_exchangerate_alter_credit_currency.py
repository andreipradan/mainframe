# Generated by Django 4.1.6 on 2023-10-27 11:42

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("exchange", "0001_initial"),
        ("finance", "0021_exchangerate"),
    ]

    operations = [
        migrations.DeleteModel(
            name="ExchangeRate",
        ),
        migrations.AlterField(
            model_name="credit",
            name="currency",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.DO_NOTHING, to="exchange.currency"
            ),
        ),
    ]
