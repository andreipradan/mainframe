# Generated by Django 4.1.6 on 2023-03-06 18:47

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("devices", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="device",
            name="is_active",
            field=models.BooleanField(default=False),
        ),
    ]
