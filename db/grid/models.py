from wq.db.patterns import models
from django.core.cache import cache

class PointType(models.NaturalKeyModel):
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
    layout = models.CharField(max_length=10, choices=LAYOUT_CHOICES)

    def __unicode__(self):
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
	    v = Point.objects.order_by('-version')[0].version
	v += 1 
        
        self.version = v
	cache.set('version', v)
	super(Point, self).save(*args, **kwargs)

    def __unicode__(self):
        return "%s, %s: %s" % (self.x, self.y, self.type)
    
    class Meta:
        ordering = ('x','y')
