# Generated by Django 5.0.4 on 2024-04-30 10:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0029_alter_timetable_options"),
    ]

    operations = [
        migrations.AlterField(
            model_name="pnl",
            name="ticker",
            field=models.CharField(blank=True, max_length=5),
        ),
        migrations.AlterField(
            model_name="stocktransaction",
            name="ticker",
            field=models.CharField(blank=True, max_length=5),
        ),
    ]
