# Generated by Django 4.1.6 on 2023-10-26 18:08

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("expenses", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="debt",
            name="to",
        ),
        migrations.AlterField(
            model_name="expensegroup",
            name="created_by",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.DO_NOTHING,
                related_name="created_groups",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
