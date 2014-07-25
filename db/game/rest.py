from wq.db.rest import app
from .models import Player

app.router.register_model(Player)
