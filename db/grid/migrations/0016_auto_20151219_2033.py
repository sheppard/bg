# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0015_auto_20151219_0249'),
    ]

    operations = [
        migrations.AlterField(
            model_name='theme',
            name='code',
            field=models.CharField(default='', unique=True, max_length=1),
            preserve_default=False,
        ),
    ]
