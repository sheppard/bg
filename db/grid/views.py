# Create your views here.
from wq.db.views import View

class IndexView(View):
    def get(self, request, *args, **kwargs):
        return {}
