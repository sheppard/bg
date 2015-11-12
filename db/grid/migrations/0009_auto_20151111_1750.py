# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0008_auto_20151109_2020'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='point',
            name='clear',
        ),
        migrations.AddField(
            model_name='point',
            name='theme',
            field=models.ForeignKey(to='grid.Theme', null=True, blank=True),
        ),
    ]
