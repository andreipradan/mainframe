# Generated by Django 4.1.6 on 2023-08-06 21:49

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0006_alter_account_options'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='transaction',
            options={'ordering': ['-completed_at']},
        ),
    ]