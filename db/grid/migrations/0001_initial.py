# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Point',
            fields=[
                ('id', models.AutoField(verbose_name='ID', auto_created=True, primary_key=True, serialize=False)),
                ('x', models.IntegerField(db_index=True)),
                ('y', models.IntegerField(db_index=True)),
                ('clear', models.CharField(max_length=20, blank=True, null=True)),
                ('version', models.IntegerField(db_index=True, blank=True, null=True)),
            ],
            options={
                'ordering': ('x', 'y'),
            },
        ),
        migrations.CreateModel(
            name='PointType',
            fields=[
                ('id', models.AutoField(verbose_name='ID', auto_created=True, primary_key=True, serialize=False)),
                ('code', models.CharField(max_length=1)),
                ('name', models.CharField(max_length=255)),
                ('value', models.IntegerField(default=0)),
                ('path', models.FileField(upload_to='sprites')),
                ('layout', models.CharField(max_length=10, choices=[('tile-1', 'Single Tile'), ('alt-4', 'Four alternating tiles'), ('anim-4', 'Four-frame animation'), ('auto-16', 'Auto layout (4x4)')])),
            ],
        ),
        migrations.AlterUniqueTogether(
            name='pointtype',
            unique_together=set([('code',)]),
        ),
        migrations.AddField(
            model_name='point',
            name='type',
            field=models.ForeignKey(to='grid.PointType'),
        ),
    ]
