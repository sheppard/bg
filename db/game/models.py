from django.db import models

class Player(models.Model):
    color = models.CharField(max_length=20)
