# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0012_pointtype_layer'),
    ]

    operations = [
        migrations.AddField(
            model_name='pointtype',
            name='replace_with',
            field=models.ForeignKey(null=True, to='grid.PointType', blank=True),
        ),
    ]
