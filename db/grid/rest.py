from wq.db.rest import app
from .models import Point
from .views import PointViewSet


app.router.register_model(
    Point,
    per_page=16*16,
    viewset=PointViewSet
)
