# Generated by Django 5.0.4 on 2024-08-19 15:31

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("earthquakes", "0007_alter_earthquake_intensity"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="earthquake",
            index=models.Index(
                fields=["timestamp"], name="earthquakes_timesta_9d98cf_idx"
            ),
        ),
    ]