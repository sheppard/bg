from django.db import models
from django.core.cache import cache

class Point(models.Model):
    x = models.IntegerField(db_index=True)
    y = models.IntegerField(db_index=True)
    type = models.CharField(max_length=1)
    clear = models.CharField(max_length=20, null=True, blank=True)
    version = models.IntegerField(db_index=True)

    def save(self, *args, **kwargs):
        v = cache.get('version')
	if not v:
	    v = 1
	v += 1 
        
        self.version = v
	cache.set('version', v)
	super(Point, self).save(*args, **kwargs)
    
    class Meta:
        ordering = ('x','y')
