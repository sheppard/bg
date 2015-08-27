from wq.db import rest
from .models import Player

rest.router.register_model(Player)
