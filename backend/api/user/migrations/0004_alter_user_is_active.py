# Generated by Django 4.1.6 on 2023-10-05 11:46

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api_user", "0003_alter_user_username"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="is_active",
            field=models.BooleanField(default=False),
        ),
    ]
