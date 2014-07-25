from wq.db.rest import app
from .models import Point


app.router.register_model(Point, per_page=10000)
