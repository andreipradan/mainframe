# Generated by Django 5.0.4 on 2024-12-20 20:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0034_cryptotransaction_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="timetable",
            name="interest",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8),
        ),
    ]