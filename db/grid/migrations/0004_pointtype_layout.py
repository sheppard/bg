# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0003_auto_20151109_1721'),
    ]

    operations = [
        migrations.AddField(
            model_name='pointtype',
            name='layout',
            field=models.ForeignKey(blank=True, null=True, to='grid.Layout'),
        ),
    ]
