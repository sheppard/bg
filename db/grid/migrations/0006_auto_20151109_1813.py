# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0005_variant_code'),
    ]

    operations = [
        migrations.AlterField(
            model_name='variant',
            name='transform_type',
            field=models.CharField(choices=[('90', 'Clockwise Quarter Turn'), ('180', 'Half Turn'), ('270', 'Conter-Clockwise Quarter Turn')], null=True, blank=True, max_length=5),
        ),
    ]
