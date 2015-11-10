from django.db import models
from wq.db.patterns.base.models import NaturalKeyModel
from django.core.cache import cache

class Theme(models.Model):
    name = models.CharField(max_length=40)
    primary1 = models.CharField(max_length=7)
    primary2 = models.CharField(max_length=7)
    primary3 = models.CharField(max_length=7)
    secondary1 = models.CharField(max_length=7)
    secondary2 = models.CharField(max_length=7)

    def __str__(self):
        return self.name

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
    code = models.CharField(max_length=1)
    layout = models.ForeignKey(Layout, related_name='variants')
    x = models.IntegerField()
    y = models.IntegerField()

    transform_source = models.ForeignKey('self', null=True, blank=True)
    transform_type = models.CharField(
        max_length=5, choices=TRANSFORM_TYPE_CHOICES, null=True, blank=True,
    )

class PointType(NaturalKeyModel):
    LAYOUT_CHOICES = [
        ('tile-1', 'Single Tile'),
        ('alt-4', 'Four alternating tiles'),
        ('anim-4', 'Four-frame animation'),
        ('auto-16', 'Auto layout (4x4)')
    ]

    code = models.CharField(max_length=1)
    name = models.CharField(max_length=255)
    value = models.IntegerField(default=0)
    path = models.FileField(upload_to="sprites")
    layout = models.ForeignKey(Layout, null=True, blank=True)
    theme = models.ForeignKey(Theme, null=True, blank=True)

    def __str__(self):
        return self.name

    class Meta:
        unique_together = [['code']]


class Point(models.Model):
    x = models.IntegerField(db_index=True)
    y = models.IntegerField(db_index=True)
    type = models.ForeignKey(PointType)
    clear = models.CharField(max_length=20, null=True, blank=True)
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
