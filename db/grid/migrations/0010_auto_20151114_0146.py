# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0009_auto_20151111_1750'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='pointtype',
            options={'ordering': ('name',)},
        ),
        migrations.AlterModelOptions(
            name='theme',
            options={'ordering': ('name',)},
        ),
        migrations.AddField(
            model_name='point',
            name='orientation',
            field=models.CharField(blank=True, choices=[('u', 'Up'), ('r', 'Right'), ('d', 'Down'), ('l', 'Left')], max_length=1, null=True),
        ),
        migrations.AlterField(
            model_name='variant',
            name='code',
            field=models.CharField(max_length=2),
        ),
    ]
