# Generated by Django 4.1.6 on 2023-03-27 18:40

import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Meal',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.TextField()),
                ('ingredients', django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=24), default=list, size=None)),
                ('nutritional_values', models.JSONField(default=dict)),
                ('quantities', models.JSONField(default=dict)),
                ('type', models.CharField(choices=[('breakfast', 'Breakfast'), ('snack_1', 'Snack #1'), ('lunch', 'Lunch'), ('snack_2', 'Snack #2'), ('dinner', 'Dinner')], max_length=10)),
                ('date', models.DateField()),
            ],
            options={
                'unique_together': {('date', 'type')},
            },
        ),
    ]