# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0007_layouts'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='pointtype',
            name='layout_old',
        ),
        migrations.AlterField(
            model_name='variant',
            name='layout',
            field=models.ForeignKey(related_name='variants', to='grid.Layout'),
        ),
    ]
