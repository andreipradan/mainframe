# Generated by Django 5.1.7 on 2025-07-03 15:18

import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0067_alter_bond_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="bond",
            name="interest_dates",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.DateField(), blank=True, default=list, size=None
            ),
        ),
    ]
