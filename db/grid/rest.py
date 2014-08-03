from wq.db.rest import app
from .models import Point, PointType
from .views import PointViewSet


app.router.register_model(
    Point,
    per_page=21*21,
    viewset=PointViewSet,
)

app.router.register_model(
    PointType,
    lookup='code',
)
