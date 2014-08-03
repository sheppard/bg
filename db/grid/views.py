from wq.db.rest.views import ModelViewSet
from django.core.cache import cache

class PointViewSet(ModelViewSet):
    def list(self, request, *args, **kwargs):
        result = super(PointViewSet, self).list(request, *args, **kwargs)
        result.data['last_version'] = cache.get('version') or 1
        return result
