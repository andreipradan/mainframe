# Generated by Django 5.0.4 on 2024-06-10 19:05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("crons", "0007_cron_name"),
    ]

    operations = [
        migrations.AlterField(
            model_name="cron",
            name="name",
            field=models.CharField(max_length=255, unique=True),
        ),
    ]
