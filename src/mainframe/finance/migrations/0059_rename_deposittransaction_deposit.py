# Generated by Django 5.0.4 on 2025-02-07 18:27

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0058_deposittransaction"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="DepositTransaction",
            new_name="Deposit",
        ),
    ]
