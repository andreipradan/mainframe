# Generated by Django 4.1.5 on 2023-01-16 09:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bots', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='bot',
            name='webhook_name',
            field=models.CharField(blank=True, max_length=32, null=True),
        ),
    ]