from wq.db.rest.views import ModelViewSet
from django.http import HttpResponse
from django.core.cache import cache
from django.conf import settings
from PIL import Image
from .models import PointType, Theme
from io import BytesIO
import os
from matplotlib.colors import hex2color
import random
from .util import make_background

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
        theme = Theme.objects.get(code=theme)
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
    return save_and_return(tdir, name, img)

def save_and_return(tdir, name, img):
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


def get_parts(code, w=2, h=2, size=32):
    ptype = PointType.objects.get(code=code)
    img = Image.open(ptype.path)
    tiles = []
    for tx in range(0, w):
        for ty in range(0, h):
            part = img.crop([tx * 32, ty * 32, (tx + 1) * 32, (ty + 1) * 32])
            if size != 32:
                part = part.resize((size, size))
            tiles.append(part)
    return tiles


def generate_bg(request, level, scale, x, y):
    out = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    if level == '0':
        generate_star_bg(out)
    else:
        generate_level_bg(out, float(level), int(x), int(y))
        data = out.load()
        for x in range(256):
            for y in range(256):
                r, g, b, a = data[x, y]
                r = int(r * 0.3)
                g = int(g * 0.3)
                b = int(b * 0.3)
                data[x, y] = r, g, b, a
    tdir = os.path.join(settings.MEDIA_ROOT, 'bg', str(level), str(scale), str(x))
    name = "%s.png" % y
    out = out.resize(((int(scale) * 256), (int(scale) * 256)))
    return save_and_return(tdir, name, out)

def generate_star_bg(out):
    special = Image.open(PointType.objects.get(code='A').path)
    parts = get_parts('a')
    for tx in range(0, 8):
        for ty in range(0, 8):
            if random.random() > 0.95:
                out.paste(special, (tx * 32, ty * 32))
            else:
                part = random.choice(parts)
                out.paste(part, (tx * 32, ty * 32))

def generate_level_bg(out, level, x, y):
    types = {
        'p': get_parts('p', 4, 4, 16),
        'e': get_parts('e', 4, 4, 16),
    }
    bg = make_background(level) 
    bg_width = bg.index('\n')
    bg_height = bg.count('\n')

    def is_same(x1, y1, x2, y2):
        if x2 < 0 or x2 >= bg_width:
            return 0
        if y2 < 0 or y2 >= bg_width:
            return 0
        t1 = bg[y1 * (bg_width + 1) + x1]
        t2 = bg[y2 * (bg_width + 1) + x2]
        return 1 if t1 == t2 else 0

    for tx in range(0, 16):
        for ty in range(0, 16):
            sx = x * 16 + tx
            sy = y * 16 + ty
            type_id = bg[sy * (bg_width + 1) + sx]
            if type_id == ' ':
                continue
            r = is_same(sx, sy, sx + 1, sy)
            l = is_same(sx, sy, sx - 1, sy)
            u = is_same(sx, sy, sx, sy - 1)
            d = is_same(sx, sy, sx, sy + 1)
            vx = r + 3 * l - 2 * r * l
            vy = d + 3 * u - 2 * u * d
            part = types[type_id][vx * 4 + vy]
            out.paste(part, (tx * 16, ty * 16))
