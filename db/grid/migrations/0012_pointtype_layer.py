# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0011_layouts2'),
    ]

    operations = [
        migrations.AddField(
            model_name='pointtype',
            name='layer',
            field=models.CharField(max_length=1, choices=[('a', 'Above Players'), ('b', 'Below Players'), ('c', 'Collectible'), ('d', 'Destroyable'), ('e', 'Enduring')], default='c'),
        ),
    ]
