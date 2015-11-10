# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0004_pointtype_layout'),
    ]

    operations = [
        migrations.AddField(
            model_name='variant',
            name='code',
            field=models.CharField(max_length=1, default=''),
            preserve_default=False,
        ),
    ]
