from wq.db.rest.views import ModelViewSet
from django.http import HttpResponse
from django.core.cache import cache
from django.conf import settings
from PIL import Image
from .models import PointType, Theme
from io import BytesIO
import os
from matplotlib.colors import hex2color


TEMP_COLORS = [
    (42, 42, 42, 253),
    (126, 126, 126, 253),
    (210, 210, 210, 253),
    (84, 84, 84, 253),
    (168, 168, 168, 253),
]

class PointViewSet(ModelViewSet):
    def list(self, request, *args, **kwargs):
        result = super(PointViewSet, self).list(request, *args, **kwargs)
        result.data['last_version'] = cache.get('version') or 1
        return result

def replace_colors(imgdata, width, height, current, new):
    for x in range(width):
       for y in range(height):
           for c, n in zip(current, new):
               if imgdata[x, y] == c:
                   imgdata[x, y] = n

def generate_theme(request, theme, image):
    pt = PointType.objects.get(path=image)
    name = os.path.basename(image)
    img = Image.open(pt.path)
    theme_id = theme
    if theme != '0':
        theme = Theme.objects.get(pk=theme)
        theme_id = str(theme.pk)

    if pt.theme is not None:
        data = img.load()
        width, height = img.size
        replace_colors(
            data, width, height, pt.theme.colors_int, TEMP_COLORS
        )
        if theme != '0':
            replace_colors(
                data, width, height, TEMP_COLORS, theme.colors_int
            )

    tdir = os.path.join(settings.MEDIA_ROOT, theme_id, os.path.dirname(image))
    try:
        os.makedirs(tdir)
    except OSError:
        pass
    img.save(os.path.join(tdir, name), 'PNG')
    output = BytesIO()
    img.save(output, 'PNG')
    output.seek(0)
    return HttpResponse(
        output.read(),
        content_type='image/png'
    )
