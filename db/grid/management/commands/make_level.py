#!/usr/bin/python

from django.core.management import setup_environ
import settings
setup_environ(settings)

from grid.models import Point
Point.objects.all().delete()

import random

count = 41

#types: b j g d

types = {}

def random_item():
        t = 'b'
        if random.random() > 0.7:
            t = 's'
            if random.random() > 0.7:
               t = 'g'
               if random.random() > 0.7:
                   t = 'd'
        
        if random.random() > 0.99:
            t = 'j'

        if random.random() > 0.999:
            t = 't'
        return t

for x in range(0, count):
    for y in range(0, count):
        t = 'b'
	if x == 0 or y == 0 or x == count-1 or y == count-1:
	    t = 'p'
        elif x % 2 == 0 and y % 2 == 0:
            t = 'p'
	elif (x % 2 == 0 or y % 2 == 0) and random.random() > 0.7:
            t = 'p'

	if t == 'b':
            t = random_item()

        if t not in types:
            types[t] = 0
        types[t] += 1
        Point.objects.create(x=x, y=y, type=t, version=1, clear=None)

for t, count in types.items():
    print '%s: %s' % (t, count)
