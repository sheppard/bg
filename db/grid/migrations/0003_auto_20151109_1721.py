# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0002_auto_20151105_1800'),
    ]

    operations = [
        migrations.CreateModel(
            name='Layout',
            fields=[
                ('id', models.AutoField(auto_created=True, serialize=False, primary_key=True, verbose_name='ID')),
                ('code', models.SlugField()),
                ('name', models.CharField(max_length=40)),
            ],
        ),
        migrations.CreateModel(
            name='Variant',
            fields=[
                ('id', models.AutoField(auto_created=True, serialize=False, primary_key=True, verbose_name='ID')),
                ('x', models.IntegerField()),
                ('y', models.IntegerField()),
                ('transform_type', models.CharField(choices=[('90', 'Clockwise Quarter Turn'), ('180', 'Half Turn'), ('270', 'Conter-Clockwise Quarter Turn')], max_length=5)),
                ('layout', models.ForeignKey(to='grid.Layout')),
                ('transform_source', models.ForeignKey(to='grid.Variant', blank=True, null=True)),
            ],
        ),
        migrations.RenameField(
            model_name='pointtype',
            old_name='layout',
            new_name='layout_old',
        ),
    ]
