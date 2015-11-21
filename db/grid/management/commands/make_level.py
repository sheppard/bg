from django.core.management.base import NoArgsCommand
from grid.models import Point, PointType
from grid.util import make_level


class Command(NoArgsCommand):
    def handle_noargs(self, **kwargs):
        level = make_level()
        width = level.index('\n')
        height = level.count('\n')
        print(width, height)
        print(level)

        types = {}

        # Point.objects.all().delete()
        for x in range(0, width):
            for y in range(0, height):
                t = level[y * (width + 1) + x]
                # ptype = PointType.objects.find(t)
                # Point.objects.create(x=x, y=y, type=ptype, clear=None)
                types.setdefault(t, 0)
                types[t] += 1

        # Point.objects.update(version=1)
        for t, count in list(types.items()):
            print('%s: %s' % (t, count))
