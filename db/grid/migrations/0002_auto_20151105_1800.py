# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Theme',
            fields=[
                ('id', models.AutoField(serialize=False, auto_created=True, primary_key=True, verbose_name='ID')),
                ('name', models.CharField(max_length=40)),
                ('primary1', models.CharField(max_length=7)),
                ('primary2', models.CharField(max_length=7)),
                ('primary3', models.CharField(max_length=7)),
                ('secondary1', models.CharField(max_length=7)),
                ('secondary2', models.CharField(max_length=7)),
            ],
        ),
        migrations.AddField(
            model_name='pointtype',
            name='theme',
            field=models.ForeignKey(blank=True, null=True, to='grid.Theme'),
        ),
    ]
