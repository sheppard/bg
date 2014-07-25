from django.db import models

class Player(models.Model):
    color = models.CharField(max_length=20)

    def __unicode__(self):
        return "Player %s (%s)" % (self.id, self.color)
