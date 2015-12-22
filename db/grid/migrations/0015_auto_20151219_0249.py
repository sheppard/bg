# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0014_pointtype_interval'),
    ]

    operations = [
        migrations.AddField(
            model_name='theme',
            name='code',
            field=models.CharField(blank=True, max_length=1, null=True),
        ),
        migrations.AddField(
            model_name='theme',
            name='elemental',
            field=models.BooleanField(default=False),
        ),
    ]
