# Generated by Django 5.0.4 on 2024-08-13 09:11

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Source",
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
                ("config", models.JSONField(default=dict)),
                ("headers", models.JSONField(default=dict)),
                ("name", models.CharField(max_length=255)),
                ("url", models.URLField()),
            ],
            options={
                "abstract": False,
            },
        ),
    ]