#!/usr/bin/python

from django.core.management import setup_environ
import settings
setup_environ(settings)

from grid.models import Point
Point.objects.all().delete()

import random

count = 20

#types: b j g d

types = {}

for x in range(0, count):
    for y in range(0, count):
        t = 'b'
        if random.random() > 0.9:
            t = 'p'
        elif random.random() > 0.7:
            t = 's'
            if random.random() > 0.7:
               t = 'g'
               if random.random() > 0.7:
                   t = 'd'
        
        if random.random() > 0.99:
            t = 'j'

        if random.random() > 0.999:
            t = 't'

        if t not in types:
            types[t] = 0
        types[t] += 1
        Point.objects.create(x=x, y=y, type=t, clear=None)

for t, count in types.items():
    print '%s: %s' % (t, count)
