import random
import math
import noise
box = ((8, 8), (120, 120))

def set_val(layer, x, y, val):
    width = layer.index('\n')
    height = layer.count('\n')
    larr = list(layer)
    larr[y * (width + 1) + x] = val
    return ''.join(larr)

def make_level():
    width = 128
    height = 128
    e_layers = combine_layers(
        make_layer('b', width, height, threshold=-0.1, jitter=1),
        make_layer('s', width, height, threshold=0.6, jitter=1),
        make_layer('g', width, height, threshold=0.6, jitter=0.3),
        make_layer('j', width, height, threshold=0.85, jitter=1),
    )
    p_layers = combine_layers(
        make_layer('p', width, height, threshold=maze_threshold, jitter=0, scale=32),
        make_layer('e', width, height, threshold=ground_threshold, jitter=0),
    )
    p_layers = make_starts(p_layers, 8)

    p_layers, special = ensure_tunnels(p_layers, 8)

    treasure = False
    def add_treasure(pts, no_rand=False):
        nonlocal treasure, p_layers
        x, y = random.choice(list(pts))
        if not treasure and (no_rand or random.random() > 0.75):
            p_layers = set_val(p_layers, x, y, 't')
            treasure = True
        elif random.random() > 0.25:
            p_layers = set_val(p_layers, x, y, 'd')
            
    for tlen, pts in sorted(special, key=lambda t: -t[0]):
        if len(pts) > 20 or tlen < 5 or random.random() > tlen / 5:
            continue
        add_treasure(pts)

    if not treasure:
        for tlen, pts in sorted(special, key=lambda t: -t[0]):
            add_treasure(pts, True)
            
    level = combine_layers(e_layers, p_layers).replace(' ', 'c')
    return level

def make_background(mult):
    width = 128 + 32
    height = 128 + 32
    def sparse_maze(x, y):
        return maze(x, y, lo=0.5)

    return combine_layers(
        make_layer('p', width, height, threshold=sparse_maze, jitter=0, scale=32, offset=1000 * mult),
        make_layer('e', width, height, threshold=ground_threshold, jitter=0, offset=1000 * mult + 1000),
    )

def make_layer(type_id, width, height, threshold=0.3, jitter=0.5, scale=16, offset=None):
    layer = ''
    if offset is None:
        offset = random.random() * random.randint(width, width * 100)
    else:
        random.seed(offset)
    for y in range(0, height):
        for x in range(0, width):
            weight1 = noise.snoise2(
                x / scale,
                y / scale,
                octaves=1,
                persistence=0.01,
                base=offset,
            )
            weight2 = random.random() * 2 - 1
            weight = (weight1 * (2-jitter) + weight2 * jitter) / 2
            if callable(threshold):
                t = threshold(x, y)
            else:
                t = default_threshold(x, y, threshold)
            if weight > t:
                layer += type_id
            else:
                layer += ' '
        layer += '\n'
    return layer

def combine_layers(*layers):
    layer = layers[0]
    for layer2 in layers[1:]:
        layer1 = layer
        layer = ''
        for t1, t2 in zip(layer1, layer2):
            if t2 != ' ':
                layer += t2
            else:
                layer += t1
    return layer


def maze_threshold(x, y):
    t = 0
    for bx, by in box:
        if abs(x - bx) == 0 or abs(y - by) == 0:
            return -1
        if abs(x - bx) < 5 or abs(y - by) < 5:
            dist = min(abs(x - bx), abs(y - by))
            t = -1 + dist / 5
    return maze(x, y, lo=t)

def ground_threshold(x, y):
    return 1 - 2 * (y / 128) * (y / 128)

def default_threshold(x, y, t):
    if x > box[0][0] and x < box[1][0] and y > box[0][1] and y < box[1][1]:
        return t
    return 1.0

def maze(x, y, lo=0.0):
    hi = 0.9
    if x % 2 == 0 and y % 2 == 0:
        return lo
    elif x % 2 == 0 or y % 2 == 0:
        if random.random() > 0.5:
            return lo
        else:
            return hi
    else:
        return hi

def print_level(level):

    pt_map = {
        'c': ' ',
        'b': '.',
        's': '*',
        'g': 'o',
        'd': 'X',
        'j': 'x',
        't': 'T',
        'p': '#',
        'e': 'S',
        'l': '+',
    }
    for real, disp in pt_map.items():
        level = level.replace(real, disp)
    print(level)

def ensure_tunnels(layer, buff=1):
    pt_cl = {}
    cl_pt = {}
    cl = 0
    offsets = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    dirs = [
        [(-1,  0)] * 6 + [( 0, -1), (0, 1)],
        [( 1,  0)] * 6 + [( 0, -1), (0, 1)],
        [( 0, -1)] * 6 + [(-1,  0), (1, 0)],
        [( 0,  1)] * 6 + [(-1,  0), (1, 0)],
        [(-1,  0), ( 0, -1)],
        [(-1,  0), ( 0,  1)],
        [( 1,  0), ( 0, -1)],
        [( 1,  0), ( 0,  1)],
    ]
    width = layer.index('\n')
    height = layer.count('\n')
    difficult = set()

    def merge_cluster(cl1, cl2):
        if len(cl_pt[cl2]) > len(cl_pt[cl1]):
            cl1, cl2 = cl2, cl1
        for pt in cl_pt[cl2]:
            pt_cl[pt] = cl1
            cl_pt[cl1].add(pt)
        del cl_pt[cl2]
        return cl1

    def no_exit(x, y, cl=None):
        exit = False
        for ox, oy in offsets:
            if x + ox < buff or x + ox >= width - buff or y + oy < buff or y + oy > height - buff:
                continue
            if layer[(y+oy) * (width + 1) + (x+ox)] in (' ', 'l', 's'):
                if not cl or pt_cl.get((x+ox, y+oy), cl) != cl:
                    exit = True
        return not exit

    for x in range(buff, width - buff):
        for y in range(buff, height - buff):
            if layer[y * (width + 1) + x] != ' ':
                continue
            cls = set()
            for ox, oy in offsets:
                if (x + ox, y + oy) in pt_cl:
                    cls.add(pt_cl[(x + ox, y + oy)])
            if len(cls) > 0:
                cls = list(cls)
                pcl = cls[0]
                for ocl in cls[1:]:
                    pcl = merge_cluster(pcl, ocl)
            else:
                pcl = cl
                cl_pt[pcl] = set()
                cl += 1 
            cl_pt[pcl].add((x, y))
            pt_cl[(x, y)] = pcl

    special = []
    while len(cl_pt.keys()) - len(difficult) > 1:
        clusters = sorted(set(cl_pt.keys()) - difficult, key=lambda cl: len(cl_pt[cl]))
        if len(clusters) == 1:
            break
        cl = clusters[0]
        found = False
        tries = 0
        while not found:
            x, y = random.choice(list(cl_pt[cl]))
            has_wall = False
            for ox, oy in offsets:
                if layer[(y+oy) * (width + 1) + (x+ox)] not in (' ', 'l', 's'):
                   has_wall = True
            if not has_wall:
                continue
            tries += 1
            if tries > 1000000:
                difficult.add(cl)
                break
            d = random.choice(dirs)
            path = []
            sx, sy = random.choice(d)
            steps = [(sx, sy)]
            while no_exit(x, y, cl=cl):
                x += sx
                y += sy
                if layer[y * (width + 1) + x] in ('i', 'w', 'X'):
                    break
                if x < buff or x >= width - buff:
                    break
                if y < buff or y >= height - buff:
                    break
                path.append((x, y))
                sx = -steps[-1][0]
                sy = -steps[-1][1]
                while sx == -steps[-1][0] and sy == -steps[-1][1]:
                    sx, sy = random.choice(d)
                steps.append((sx, sy))
            x += sx
            y += sy
            end_cl = pt_cl.get((x, y), cl)
            if end_cl != cl:
                found = True
                if end_cl in difficult:
                    difficult.remove(end_cl)
                fpath = []
                for rx, ry in reversed(path):
                    fpath.append((rx, ry))
                    if not no_exit(rx, ry, cl=end_cl):
                        break
                path = fpath
                grp1 = cl_pt[cl]
                grp2 = cl_pt[end_cl]
                if len(grp1) > len(grp2):
                    special.append((len(path), grp2))
                else:
                    special.append((len(path), grp1))
                if len(path) > 6 or layer[y * (width + 2) + x] == 'l':
                    t = 'l'
                elif len(path) < 4:
                    t = 's'
                else:
                    if random.random() > 0.5:
                        t = 'l'
                    else:
                        t = 's'
                cl = merge_cluster(cl, end_cl)
                for x, y in path:
                    layer = set_val(layer, x, y, t)
                    pt_cl[(x, y)] = cl
                    cl_pt[cl].add((x, y))
    for cl in difficult:
        for x, y in cl_pt[cl]:
            layer = set_val(layer, x, y, 's')
    return layer, special


def make_starts(layer, buffer=0):
    width = layer.index('\n')
    height = layer.count('\n')
    nx = math.floor(width / 32)
    xspace = width / nx
    ny = math.floor(height / 32)
    yspace = height / ny
    buffer += 5

    def make_start(sx, sy):
        nonlocal layer
        x = -1
        y = -1
        while x < buffer or x >= width - buffer:
            x = random.randint(sx * xspace, (sx + 1) * xspace)
        while y < buffer or y >= height - buffer:
            y = random.randint(sy * yspace, (sy + 1) * yspace)
        dirs = {
            'u': 0,
            'd': 0,
            'l': 0,
            'r': 0,
        }
        for tx in range(x - 2, x + 3):
            for ty in range(y - 2, y + 3):
                if layer[ty * (width + 1) + tx] == ' ':
                    continue
                if tx < x:
                    dirs['l'] += 1
                if tx > x:
                    dirs['r'] += 1
                if ty < y:
                    dirs['u'] += 1
                if ty > y:
                    dirs['d'] += 1
        maxd = 0
        for count in dirs.values():
            if count > maxd:
                maxd = count
        cdirs = []
        for dir, count in dirs.items():
            if count == maxd:
                cdirs.append(dir)
        dir = random.choice(cdirs)
        print(x, y, dir)
        for tx in range(x - 2, x + 3):
            for ty in range(y - 2, y + 3):
                if tx == x - 2 or tx == x + 2 or ty == y - 2 or ty == y + 2:
                    val = 'i'
                elif tx == x and ty == y:
                    val = 'X'
                else:
                    val = 'w'
                layer = set_val(layer, tx, ty, val)
        if dir == 'l':
            layer = set_val(layer, x + 2, y, ' ')
            layer = set_val(layer, x + 3, y, ' ')
        elif dir == 'r':
            layer = set_val(layer, x - 2, y, ' ')
            layer = set_val(layer, x - 3, y, ' ')
        elif dir == 'u':
            layer = set_val(layer, x, y + 2, ' ')
            layer = set_val(layer, x, y + 3, ' ')
        elif dir == 'd':
            layer = set_val(layer, x, y - 2, ' ')
            layer = set_val(layer, x, y - 3, ' ')
        else:
            raise Exception("Unknown dir")

    for sx in range(0, nx):
        for sy in range(0, nx):
            make_start(sx, sy)

    return layer
