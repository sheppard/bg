# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


def create_layouts(apps, schema_editor):
    LAYOUT_CHOICES = [
        {
            'code': 'dir-4',
            'name': 'Orientable Tile',
            'variants': [
                ('↑', 0, 0, None, None),
                ('→', 0, 1, '↑', '90'),
                ('↓', 0, 2, '↑', '180'),
                ('←', 0, 3, '↑', '270'),
            ]
        },
        {
            'code': 'diranim-16',
            'name': 'Orientable Animation (4x4)',
            'variants': [
                ('↑1', 0, 0, None, None),
                ('↑2', 1, 0, None, None),
                ('↑3', 2, 0, None, None),
                ('↑4', 3, 0, None, None),
                ('→1', 0, 1, '↑1', '90'),
                ('→2', 1, 1, '↑2', '90'),
                ('→3', 2, 1, '↑3', '90'),
                ('→4', 3, 1, '↑4', '90'),
                ('↓1', 0, 2, '↑1', '180'),
                ('↓2', 1, 2, '↑2', '180'),
                ('↓3', 2, 2, '↑3', '180'),
                ('↓4', 3, 2, '↑4', '180'),
                ('←1', 0, 3, '↑1', '270'),
                ('←2', 1, 3, '↑2', '270'),
                ('←3', 2, 3, '↑3', '270'),
                ('←4', 3, 3, '↑4', '270'),
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


class Migration(migrations.Migration):

    dependencies = [
        ('grid', '0010_auto_20151114_0146'),
    ]

    operations = [
        migrations.RunPython(create_layouts)
    ]
