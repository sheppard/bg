require(["d3", "wq/store", "wq/model", "wq/outbox"], function(d3, ds, model, outbox) {
ds.init({'service': ''});
outbox.init();
var ptypes;
model('/pointtypes').prefetch().then(function(data) {
    ptypes = {};
    data.list.forEach(function(ptype) {
        ptype.image = new Image();
        ptype.image.src = ptype.path;
        ptypes[ptype.id] = ptype;
    });
});
var unknown = {
    'layout': 'anim-4',
    'image': new Image()
};
unknown.image.src = '/images/spin.png';

var pcolors = ['#99f', '#f9f', '#9ff', '#f99', '#ff9', '#9f9'];
var pcolor = pcolors[Math.floor(Math.random()*pcolors.length)];
var layouts = {
    'tile-1': [1, 1],
    'alt-4': [2, 2],
    'anim-4': [4, 1],
    'auto-16': [4, 4]
};

/*var player = {};
ds.save({
  'url': 'players',
  'method': 'POST',
  'color': pcolor
}, undefined, function(p){
    player.info = p;
}); */

var jumps = 1;
var score = 0;
//var version = 1;

var tileSize = 32;
var bufferScale = 16;
var renderSize = tileSize;
var bounds = {
    'w': document.body.clientWidth,
    'h': document.body.clientHeight
};
var length = bounds.w > bounds.h ? bounds.w : bounds.h;
while(length / renderSize > 16) {
    renderSize += tileSize / 2;
}
var count = 128; // should load from server
var o = {};
o.x = Math.round(Math.random() * count / 2 + count / 4);
o.y = Math.round(Math.random() * count / 2 + count / 4);
o.w = Math.floor(bounds.w / renderSize / 2) * 2;
o.h = Math.floor(bounds.h / renderSize / 2) * 2;
var last = {'x': o.x, 'y': o.y, 'w': o.w, 'h': o.h};
var scope = {'x': o.x, 'y': o.y, 'w': 20, 'h': 20};
var swidth = renderSize * o.w;
var sleft = (bounds.w - swidth) / 2;
var sheight = renderSize * o.h;
var stop = (bounds.h - sheight) / 2;
var grid = {};


function nav(d, anim) {
    o.x = d.x;
    o.y = d.y;
    if (o.x < 0) o.x = 0;
    if (o.y < 0) o.y = 0;
    if (o.x > count) o.x = count;
    if (o.y > count) o.y = count;
    if (Math.abs(scope.x - o.x) > 3 || Math.abs(scope.y - o.y) > 3) {
        scope.x = Math.round(o.x);
        scope.y = Math.round(o.y);
    }
    if (anim) {
        if (o.x != last.x || o.y != last.y) {
            noffset.attr('x', last.x);
            noffset.attr('y', last.y);
            o.b = 5;
            noffset.transition().duration(300)
               .attr('x', o.x)
               .attr('y', o.y)
               .each('end', function() {
                   o.b = 1;
               });
            last.x = o.x;
            last.y = o.y;
        }
    } else {
        noffset.attr('x', o.x);
        noffset.attr('y', o.y);
        last.x = o.x;
        last.y = o.y;
    }
}

var canvas = d3.select('body').append('canvas')
   .style('position', 'absolute')
   .attr('width', swidth)
   .attr('height', sheight)
   .style('left', sleft)
   .style('top', stop);

var touchInfo = {};
canvas.on('touchstart', function(evt) {
    var touches = d3.touches(this);
    touchInfo.start = {
        'x': touches[0][0],
        'y': touches[0][1]
    }
    touchInfo.offset = {
        'x': o.x,
        'y': o.y
    };
});
canvas.on('touchmove', function(evt) {
    var touches = d3.touches(this);
    var tx = touches[0][0] - touchInfo.start.x;
    var ty = touches[0][1] - touchInfo.start.y;
    nav({
        'x': touchInfo.offset.x - (tx / renderSize),
        'y': touchInfo.offset.y - (ty / renderSize)
    });
});
canvas.on('click', click);

var context = canvas.node().getContext('2d');
var buffers = {};

var mini = d3.select('body').append('canvas')
    .attr('width', count)
    .attr('height', count)
    .attr('style', 'position:absolute;right:0;bottom:0;background-color:#333');
var minicontext = mini.node().getContext('2d');
var minipixel = minicontext.createImageData(1, 1);

var custom = d3.select(document.createElement('custom-elem'));
var minielem = d3.select(document.createElement('custom-elem-mini'));
var noffset = d3.select(document.createElement('custom-elem-offset'));

noffset.attr('x', o.x);
noffset.attr('y', o.y);
o.b = 1;

var colors = [];
function color(d) {
  if (d.pending)
    return '#f90';
  if (d.clear)
    return d.clear;
  return 'transparent';
}
function hcolor(d) {
  if (d.clear)
    return 'transparent';
  else
    return '#eef';
}

setInterval(anim, 100);
var frame = 0;
function anim() {
    frame++;
    if (frame > 3)
        frame = 0;
    render();
}

update();
function update() {
    var minx = scope.x - scope.w / 2,
        maxx = scope.x + scope.w / 2,
        miny = scope.y - scope.h / 2,
        maxy = scope.y + scope.h / 2;
    var tiles = _getTiles(minx, miny, maxx, maxy);
    var last_version = 100000000;
    tiles.forEach(function(d) {
        if (d.last_version < last_version)
            last_version = d.last_version;
    });
    var url = '/points.json?version__gt=' + last_version;
    url += '&x__gte=' + minx;
    url += '&x__lte=' + maxx;
    url += '&y__gte=' + miny;
    url += '&y__lte=' + maxy;
    d3.json(url, function(data) {
        tiles.forEach(function(d) {
            d.last_version = data.last_version;
        });
        data.list.forEach(function(d) {
            d.last_version = data.last_version;
            if (!grid[d.x])
                grid[d.x] = {};
            if (grid[d.x][d.y] && grid[d.x][d.y].clear && !d.clear)
                return;
            grid[d.x][d.y] = d;
        });
        setTimeout(update, 1000);
    });
}

function _getViewport() {
    var minx = Math.max(0, Math.floor(o.x - o.w / 2 - o.b)),
        maxx = Math.min(count, Math.ceil(o.x + o.w / 2 + o.b)),
        miny = Math.max(0, Math.floor(o.y - o.h / 2 - o.b)),
        maxy = Math.min(count, Math.ceil(o.y + o.h / 2 + o.b));
    return {
        'min': {'x': minx, 'y': miny},
        'max': {'x': maxx, 'y': maxy},
    }
}

d3.timer(refresh);
function refresh() {
    var buffers = _getBuffers(_getViewport());
    context.clearRect(0, 0, swidth, sheight);
    buffers.forEach(function(buffer) {
        var ox = (noffset.attr('x') - o.w / 2 - (buffer.x * bufferScale)) * renderSize;
        var oy = (noffset.attr('y') - o.h / 2 - (buffer.y * bufferScale)) * renderSize;
        context.drawImage(
            buffer.canvas,
            0,
            0,
            tileSize * bufferScale,
            tileSize * bufferScale,
            -ox,
            -oy,
            renderSize * bufferScale,
            renderSize * bufferScale
        );
    });
}


setInterval(cleanup, 10000);
function cleanup() {
    var current = _getBuffers(_getViewport());
    var tl = current[0];
    var br = current[current.length - 1];
    var x, y;
    for (x in buffers) {
        for (y in buffers[x]) {
            if (x < tl.x - 1 || x > br.x + 1 || y < tl.y - 1 || y > br.y + 1) {
                console.log("deleting buffer:" + x + ',' + y);
                delete buffers[x][y];
            }
        }
    }
}

function render() {
    if (!ptypes) return;
    var viewport = _getViewport(),
        minx = viewport.min.x,
        maxx = viewport.max.x,
        miny = viewport.min.y,
        maxy = viewport.max.y;
        current = _getTiles(minx, miny, maxx, maxy);
    current.forEach(function(d) {
        d.tileOffset = _tileXY(d);
    });
    var pts = custom.selectAll('tile')
        .data(current, function(d){
            return (
                d.x + '/' + d.y +
                d.type_id + '/' + d.clear + '/' +
                d.tileOffset.x + '/' + d.tileOffset.y
            );
        });
    draw(pts.enter().append('tile'));
    pts.exit().remove();
    // draw(pts);
    d3.select('#jumps').text(jumps);
    d3.select('#score').text(score);
    d3.select('#loc').text(Math.round(o.x, 1) + ',' + Math.round(o.y, 1));
}

/*
g.on('mouseover', function() {
//   d3.select(this).selectAll('rect').attr('fill', hcolor)
});
g.on('mouseout', function() {
//   d3.select(this).selectAll('rect').attr('fill', color);
});
*/

setInterval(_minimap, 1000);
function _minimap() {
    var pts = [];
    for (var x in grid) {
        for (var y in grid[x]) {
            pts.push(grid[x][y]);
        }
    }
    if (!pts.length) return;
    var r = minielem.selectAll('tile').data(pts, function(d) {return d.x + ',' + d.y });
    r.enter().append('tile')
        .attr('x', function(d) { return d.x })
        .attr('y', function(d) { return d.y });

    r.attr('fill', function(d) {
        if (d.clear)
            return d.clear;
        if (d.type_id == 'p')
            return '#999';
        return '#fff';
    });
    r.attr('opacity', function(d) {
        if (d.x < scope.x - scope.w / 2 || d.x > scope.x + scope.w / 2 || d.y < scope.y - scope.h / 2 || d.y > scope.y + scope.h / 2)
           return 0.33;
        if (d.x < o.x - o.w / 2 || d.x > o.x + o.w / 2 || d.y < o.y - o.h / 2 || d.y > o.y + o.h / 2)
           return 0.67;
        return 1;
    });
    r.each(function(d) {
        var node = d3.select(this);
        var p = minipixel.data;
        var fill = node.attr('fill');
        var opacity = node.attr('opacity');
        var x = node.attr('x');
        var y = node.attr('y');
        var r = parseInt(fill.charAt(1), 16) * 0x11;
        var g = parseInt(fill.charAt(2), 16) * 0x11;
        var b = parseInt(fill.charAt(3), 16) * 0x11;
        p[0] = r;
        p[1] = g;
        p[2] = b;
        p[3] = Math.round(opacity * 255);
        minicontext.putImageData(minipixel, x, y);
    });
}


function _getTile(x, y) {
    if (!grid[x] || !grid[x][y])
        return {'x': x, 'y': y, 'version': -1, 'last_version': -1};
    var tile = {};
    for (var key in grid[x][y]) {
        tile[key] = grid[x][y][key];
    }
    return tile;
}

function _getTiles(minx, miny, maxx, maxy) {
    var tiles = [], x, y;
    for (x = minx; x <= maxx; x++) {
        for (y = miny; y <= maxy; y++) {
            tiles.push(_getTile(x, y));
        }
    }
    return tiles;
}

function _getBuffer(x, y) {
    var bufferX = Math.floor(x / bufferScale);
    var bufferY = Math.floor(y / bufferScale);
    var buffer;
    if (!buffers[bufferX]) {
        buffers[bufferX] = {};
    }
    if (buffers[bufferX][bufferY]) {
        buffer = buffers[bufferX][bufferY];
    } else {
        buffer = buffers[bufferX][bufferY] = {
            'x': bufferX,
            'y': bufferY
        };
        buffer.canvas = document.createElement('canvas');
        buffer.canvas.width = tileSize * bufferScale;
        buffer.canvas.height = tileSize * bufferScale;
        buffer.context = buffer.canvas.getContext('2d');
    }
    return buffer;
}

function _getBuffers(viewport) {
    var minx = Math.floor(viewport.min.x / bufferScale);
    var miny = Math.floor(viewport.min.y / bufferScale);
    var maxx = Math.floor(viewport.max.x / bufferScale);
    var maxy = Math.floor(viewport.max.y / bufferScale);
    var buffers = [], x, y;
    for (x = minx; x <= maxx; x++) {
        for (y = miny; y <= maxy; y++) {
            buffers.push(_getBuffer(x * bufferScale, y * bufferScale));
        }
    }
    return buffers;
}

var _variant = {};
function _tileXY(d) {
    var type = ptypes[d.type_id] || unknown;
    if (!type || type.layout == 'tile-1')
        return {'x': 0, 'y': 0};
    if (type.layout == 'alt-4') {
        var key = d.x + ',' + d.y;
        if (!_variant[key]) {
            var dx = Math.random() < 0.5 ? 0 : 1;
            var dy = Math.random() < 0.5 ? 0 : 1;
            _variant[key] = {'x': dx, 'y': dy};
         }
         return _variant[key];
    }
    if (type.layout.indexOf('anim') == 0)
        return {'x': frame, 'y': 0};

    // auto-16
    var l = _getTile(d.x - 1, d.y).type_id == d.type_id;
    var r = _getTile(d.x + 1, d.y).type_id == d.type_id;
    var u = _getTile(d.x, d.y - 1).type_id == d.type_id;
    var d = _getTile(d.x, d.y + 1).type_id == d.type_id;

    var tx = r + 3 * l - 2 * r * l;
    var ty = d + 3 * u - 2 * u * d;

    return {
        'x': tx,
        'y': ty
    }
}

function draw(pts) {
   pts.attr('x', function(d) {
       // var ox = noffset.attr('x');
       // return (-ox + o.w / 2 + d.x) * renderSize;
       return d.x * tileSize;
   });
   pts.attr('y', function(d) {
       // var oy = noffset.attr('y');
       // return (-oy + o.h / 2 + d.y) * renderSize;
       return d.y * tileSize;
   });
   pts.attr('tile-x', function(d) {
       return d.tileOffset.x * tileSize;
   });
   pts.attr('tile-y', function(d) {
       return d.tileOffset.y * tileSize;
   });
   pts.each(function(d) {
       var node = d3.select(this);
       var ptype = ptypes[d.type_id] || unknown;
       var buffer = _getBuffer(d.x, d.y);
       var x = node.attr('x') - (buffer.x * tileSize * bufferScale);
       var y = node.attr('y') - (buffer.y * tileSize * bufferScale);
       buffer.context.clearRect(
           x, y, tileSize, tileSize
       );
       buffer.context.drawImage(
           ptype.image,
           node.attr('tile-x'),
           node.attr('tile-y'),
           tileSize,
           tileSize,
           x,
           y,
           tileSize,
           tileSize
       );
       if (d.clear) {
           buffer.context.fillStyle = d.clear;
           buffer.context.fillRect(
               x, y, tileSize, tileSize
           );
       }
   });
}

function check(pt, ox, oy) {
   return _getTile(pt.x + ox, pt.y + oy).clear == pcolor;
}

function click() {
    var coords = d3.mouse(this);
    var x = Math.round(coords[0] / renderSize + o.x - 0.5) - (o.w / 2);
    var y = Math.round(coords[1] / renderSize + o.y - 0.5) - (o.h / 2);
    var dx = x - o.x;
    var dy = y - o.y;
    if (dx > (o.w / 2 - 2) || dx < (-o.w / 2 + 1) ||
        dy > (o.h / 2 - 2) || dy < (-o.h / 2 + 1)) {
        nav({'x': x, 'y': y}, true);
        return;
    }

    var d = _getTile(x, y);
    if (!d.type_id || d.type_id == 'p' || d.clear == pcolor || !ptypes[d.type_id])
        return;
    var c1 = check(d, -1, 0)
        c2 = check(d,  1, 0)
        c3 = check(d, 0, -1)
        c4 = check(d, 0,  1)
    if (!c1 && !c2 && !c3 && !c4) {
        if (jumps == 0)
            return;
        jumps--;
        d3.select('#jumps').text(jumps)
    }
    d.pending = true;
    if (d.type_id == 'j')
        jumps++;
    score += ptypes[d.type_id].value || 0;
    d.type_id = 'c';
    d.clear = pcolor;
    grid[x][y] = d;

    outbox.save({
        'x': d.x,
        'y': d.y,
        'type_id': d.type_id,
        'clear': pcolor,
    }, {
        'url': 'points/' + d.id,
        'method': 'PUT',
    }).then(function(item) {
        if (item.saved) {
            result.last_version = result.version;
            grid[result.x][result.y] = result;
        }
    });
}

});
