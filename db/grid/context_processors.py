from .models import Theme
from wq.db import rest

def themes(request):
    return {
        'themes': rest.router.serialize(
            Theme.objects.all(),
            many=True
        )
    }
