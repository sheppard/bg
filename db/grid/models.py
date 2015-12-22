from django.db import models
from wq.db.patterns.base.models import NaturalKeyModel
from django.core.cache import cache
from matplotlib.colors import hex2color

class Theme(models.Model):
    name = models.CharField(max_length=40)
    code = models.CharField(max_length=1, unique=True)
    elemental = models.BooleanField(default=False)
    primary1 = models.CharField(max_length=7)
    primary2 = models.CharField(max_length=7)
    primary3 = models.CharField(max_length=7)
    secondary1 = models.CharField(max_length=7)
    secondary2 = models.CharField(max_length=7)

    def __str__(self):
        return self.name

    @property
    def colors_int(self):
        def hex_to_rgba(color):
            rgb = hex2color(color)
            return tuple(int(c * 255) for c in rgb + (1,))

        return list(map(hex_to_rgba, [
            self.primary1,
            self.primary2,
            self.primary3,
            self.secondary1,
            self.secondary2,
        ]))

    class Meta:
        ordering = ('name',)


class Layout(models.Model):
    code = models.SlugField()
    name = models.CharField(max_length=40)

    def __str__(self):
        return self.name

class Variant(models.Model):
    TRANSFORM_TYPE_CHOICES = [
        ('90', 'Clockwise Quarter Turn'),
        ('180', 'Half Turn'),
        ('270', 'Conter-Clockwise Quarter Turn'),
    ]
    code = models.CharField(max_length=2)
    layout = models.ForeignKey(Layout, related_name='variants')
    x = models.IntegerField()
    y = models.IntegerField()

    transform_source = models.ForeignKey('self', null=True, blank=True)
    transform_type = models.CharField(
        max_length=5, choices=TRANSFORM_TYPE_CHOICES, null=True, blank=True,
    )

class PointType(NaturalKeyModel):
    LAYER_CHOICES = [
        ('a', 'Above Players'),
        ('b', 'Below Players'),
        ('c', 'Collectible'),
        ('d', 'Destroyable'),
        ('e', 'Enduring'),
    ]

    code = models.CharField(max_length=1)
    name = models.CharField(max_length=255)
    value = models.IntegerField(default=0)
    path = models.FileField(upload_to="sprites")
    layout = models.ForeignKey(Layout, null=True, blank=True)
    interval = models.IntegerField(null=True, blank=True)
    layer = models.CharField(
        max_length=1,
        choices=LAYER_CHOICES,
        default='c',
    )
    theme = models.ForeignKey(Theme, null=True, blank=True)
    replace_with = models.ForeignKey("self", null=True, blank=True)

    def __str__(self):
        return self.name

    class Meta:
        unique_together = [['code']]
        ordering = ('name',)


class Point(models.Model):
    ORIENTATION_CHOICES = [
        ('u', 'Up'),
        ('r', 'Right'),
        ('d', 'Down'),
        ('l', 'Left'),
    ]
    x = models.IntegerField(db_index=True)
    y = models.IntegerField(db_index=True)
    type = models.ForeignKey(PointType)
    theme = models.ForeignKey(Theme, null=True, blank=True)
    orientation = models.CharField(
        max_length=1, choices=ORIENTATION_CHOICES, null=True, blank=True
    )
    version = models.IntegerField(db_index=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        v = cache.get('version')
        if not v:
            pts = Point.objects.order_by('-version')
            if pts.count() > 0:
                v = pts[0].version
            else:
                v = 0
        v += 1 

        self.version = v
        cache.set('version', v)
        super(Point, self).save(*args, **kwargs)

    def __str__(self):
        return "%s, %s: %s" % (self.x, self.y, self.type)

    class Meta:
        ordering = ('x','y')
