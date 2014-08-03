from django.core.management.base import NoArgsCommand
from grid.models import PointType
from wq.io import load_file


class Command(NoArgsCommand):
    def handle_noargs(self, **kwargs):
        types = load_file('../assets/pointtypes.csv')
        for row in types:
            ptype = PointType.objects.find(row.code)
            ptype.name = row.name
            ptype.value = row.value
            ptype.layout = row.layout
            ptype.path = row.path
            ptype.save()
