from django.core.management.base import NoArgsCommand
from grid.models import Point, PointType
import random


class Command(NoArgsCommand):
    def handle_noargs(self, **kwargs):

        Point.objects.all().delete()

        count = 128

        #types: b j g d

        types = {}

        def random_item():
            t = 'b'
            if random.random() > 0.7:
                t = 'c'
            if random.random() > 0.8:
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
                elif x % 2 == 0 and y % 2 == 0 and random.random() > 0.2:
                    t = 'p'
                elif (x % 2 == 0 or y % 2 == 0) and random.random() > 0.7:
                    t = 'p'
                elif random.random() > 0.99:
                    t = 'p'

                if t == 'b':
                    t = random_item()

                if t not in types:
                    types[t] = 0
                types[t] += 1
                ptype = PointType.objects.find(t)
                Point.objects.create(x=x, y=y, type=ptype, clear=None)

        Point.objects.update(version=1)
        for t, count in types.items():
            print '%s: %s' % (t, count)
