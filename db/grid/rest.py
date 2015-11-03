from wq.db import rest
from .models import Point, PointType
from .views import PointViewSet


rest.router.register_model(
    Point,
    per_page=21*21,
    viewset=PointViewSet,
)

rest.router.register_model(
    PointType,
    lookup='code',
)

rest.router.add_page('index', {'url': ''})
rest.router.add_page('play', {})
