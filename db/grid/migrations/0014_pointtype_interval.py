# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0013_pointtype_replace_with'),
    ]

    operations = [
        migrations.AddField(
            model_name='pointtype',
            name='interval',
            field=models.IntegerField(null=True, blank=True),
        ),
    ]
