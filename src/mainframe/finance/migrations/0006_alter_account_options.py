# Generated by Django 4.1.6 on 2023-08-06 19:09

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("finance", "0005_transaction"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="account",
            options={"ordering": ("-updated_at",)},
        ),
    ]
