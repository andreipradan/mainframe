# Generated by Django 5.0.4 on 2024-04-30 10:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bots", "0005_alter_message_options"),
    ]

    operations = [
        migrations.AlterField(
            model_name="bot",
            name="last_name",
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AlterField(
            model_name="bot",
            name="webhook",
            field=models.URLField(blank=True),
        ),
        migrations.AlterField(
            model_name="bot",
            name="webhook_name",
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AlterField(
            model_name="message",
            name="text",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
