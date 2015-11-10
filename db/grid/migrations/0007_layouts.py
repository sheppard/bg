# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


def create_layouts(apps, schema_editor):
    LAYOUT_CHOICES = [
        {
            'code': 'tile-1',
            'name': 'Single Tile',
            'variants': [
                ('1', 0, 0, None, None),
            ]
        },
        {
            'code': 'alt-4',
            'name': 'Four alternating tiles',
            'variants': [
                ('a', 0, 0, None, None),
                ('b', 1, 0, None, None),
                ('c', 0, 1, None, None),
                ('d', 1, 1, None, None),
            ]
        },
        {
            'code': 'anim-4',
            'name': 'Four-frame animation',
            'variants': [
                ('1', 0, 0, None, None),
                ('2', 1, 0, None, None),
                ('3', 2, 0, None, None),
                ('4', 3, 0, None, None),
            ]
        },
        {
            'code': 'auto-16',
            'name': 'Auto layout (4x4)',
            'variants': [
                ('•', 0, 0, None, None),
                ('╺', 1, 0, None, None),
                ('╻', 0, 1, '╺', '90'),
                ('╸', 3, 0, '╺', '180'),
                ('╹', 0, 3, '╺', '270'),
                ('┏', 1, 1, None, None),
                ('┓', 3, 1, '┏', '90'),
                ('┛', 3, 3, '┏', '180'),
                ('┗', 1, 3, '┏', '270'),
                ('━', 2, 0, None, None),
                ('┃', 0, 2, '━', '90'),
                ('┳', 2, 1, None, None),
                ('┫', 3, 2, '┳', '90'),
                ('┻', 2, 3, '┳', '180'),
                ('┣', 1, 2, '┳', '270'),
                ('╋', 2, 2, None, None),
            ]
        }
    ]

    Layout = apps.get_model("grid", "Layout")
    Variant = apps.get_model("grid", "Variant")
    PointType = apps.get_model("grid", "PointType")

    for ldata in LAYOUT_CHOICES:
        layout, is_new = Layout.objects.get_or_create(
            code=ldata['code'],
            name=ldata['name'],
        )
        for code, x, y, tcode, ttype in ldata['variants']:
            if tcode:
                tcode = Variant.objects.get(
                    layout=layout,
                    code=tcode
                )
            variant, is_new = Variant.objects.get_or_create(
                layout=layout,
                code=code,
                x=x,
                y=y,
                transform_source=tcode,
                transform_type=ttype
           )
    for pt in PointType.objects.all():
        pt.layout = Layout.objects.get(code=pt.layout_old)
        pt.save()


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0006_auto_20151109_1813'),
    ]

    operations = [
        migrations.RunPython(create_layouts)
    ]
