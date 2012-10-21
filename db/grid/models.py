from django.db import models

class Point(models.Model):
    x = models.IntegerField(db_index=True)
    y = models.IntegerField(db_index=True)
    type = models.CharField(max_length=1)
    clear = models.BooleanField()
    class Meta:
        ordering = ('x','y')
