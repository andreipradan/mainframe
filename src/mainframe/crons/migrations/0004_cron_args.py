# Generated by Django 5.0.4 on 2024-04-26 23:32

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("crons", "0003_remove_cron_description_remove_cron_is_management"),
    ]

    operations = [
        migrations.AddField(
            model_name="cron",
            name="args",
            field=models.JSONField(default=list),
        ),
    ]
