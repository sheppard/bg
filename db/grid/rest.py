from wq.db import rest
from .models import Point, PointType, Theme, Layout
from .views import PointViewSet
from .serializers import LayoutSerializer


rest.router.register_model(
    Point,
    per_page=21*21,
    viewset=PointViewSet,
)

rest.router.register_model(
    PointType,
    lookup='code',
)

rest.router.register_model(Theme)
rest.router.register_model(
    Layout,
    serializer=LayoutSerializer,
    lookup='code'
)

rest.router.add_page('index', {'url': ''})
rest.router.add_page('play', {})
rest.router.add_page('playbg', {})
rest.router.add_page('edit', {})
