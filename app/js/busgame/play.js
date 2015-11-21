define(["d3", "wq/app"], function(d3, app) {
return {
    'name': 'play',
    'init': function(){},
    'run': function(page) {
        if (page == 'play' || page == 'edit') {
            $('body').css('overflow-y', 'hidden');
            play(page == 'edit')
        } else {
            $('body').css('overflow-y', 'auto');
        }
    }
};

function play(edit) {

var ptypes;
app.models.pointtype.prefetch().then(function(data) {
    ptypes = {};
    data.list.forEach(function(ptype) {
        ptype.image = new Image();
        ptype.image.src = '/media/' + ptype.path;
        ptypes[ptype.id] = ptype;
        if (ptype.theme_id) {
            ptype.themes = {};
            themes.forEach(function(theme) {
                var timg = new Image();
                ptype.themes[theme.id] = timg;
                timg.src = '/media/' + theme.id + '/' + ptype.path;
            });
        }
    });
});
var themes;
var ptheme;
app.models.theme.load().then(function(data) {
    themes = data.list;
    ptheme = themes[Math.floor(Math.random()*themes.length)];
});
var unknown = {
    'layout_id': 'anim-4',
    'image': new Image()
};
unknown.image.src = '/images/spin.png';

var layouts = {
    'tile-1': [1, 1],
    'alt-4': [2, 2],
    'anim-4': [4, 1],
    'dir-4': [1, 4],
    'auto-16': [4, 4],
    'diranim-16': [4, 4]
};
var dirIndex = {
    'u': 0,
    'r': 1,
    'd': 2,
    'l': 3
}

var jumps = 1;
var score = 0;

var tileSize = 32;
var bufferScale = 16;
var renderSize = tileSize;
var bounds = {
    'w': document.body.clientWidth,
    'h': document.body.clientHeight
};
if (edit) {
    bounds.h -= 40;
}
var length = bounds.w > bounds.h ? bounds.w : bounds.h;
while(length / renderSize > 20) {
    renderSize += tileSize;
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
if (edit) {
    stop += 40;
}
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

var canvas = d3.select('#play').append('canvas')
   .style('position', 'fixed')
   .attr('width', swidth)
   .attr('height', sheight)
   .style('left', sleft + 'px')
   .style('top', stop + 'px');

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
context.webkitImageSmoothingEnabled = false;
context.mozImageSmoothingEnabled = false;
context.imageSmoothingEnabled = false;
var buffers = {};

var mini = d3.select('#play').append('canvas')
    .attr('width', count)
    .attr('height', count)
    .attr('style', 'position:fixed;right:0;bottom:0;background-color:#333');
var minicontext = mini.node().getContext('2d');
var minipixel = minicontext.createImageData(1, 1);

var custom = d3.select(document.createElement('custom-elem'));
var minielem = d3.select(document.createElement('custom-elem-mini'));
var noffset = d3.select(document.createElement('custom-elem-offset'));


noffset.attr('x', o.x);
noffset.attr('y', o.y);
o.b = 1;

setInterval(anim, 150);
var frame = 0;
function anim() {
    frame++;
    if (frame > 3)
        frame = 0;
    render();
}

var socket = new WebSocket('ws://' + window.location.host + ':10234');
socket.onmessage = function(msg) {
    var parts = msg.data.split(' ');
    var cmd = parts.shift();
    commands[cmd].apply(this, parts);
}

var commands = {};
commands['GRID'] = function(level) {
    var rows = level.split('\n');
    // width = rows[0].length;
    // height = rows.length;
    rows.forEach(function(row, y) {
        row.split('').forEach(function(type, x) {
            if (!grid[x])
                grid[x] = {};
            grid[x][y] = {
                'x': x,
                'y': y,
                'type_id': type,
                'theme_id': null,
                'orientation': null
            };
        });
    });
}

commands['POINT'] = function(x, y, type, theme, orientation) {
    var pt = grid[x][y];
    pt.x = +x;
    pt.y = +y;
    pt.type_id = type;
    pt.theme_id = +theme;
    pt.orientation = orientation;
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
                d.type_id + '/' + d.theme_id + '/' +
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

setInterval(_minimap, 1000);
function _minimap() {
    return;
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
        if (d.theme_id) {
            var tcolor;
            themes.forEach(function(theme) {
                if (d.theme_id == theme.id) {
                    tcolor = theme.primary2;
                }
            });
            return tcolor;
        }
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
        if (fill.length == 7) {
            fill = '#' + fill.charAt(1) + fill.charAt(3) + fill.charAt(5);
        }
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
        return {'x': x, 'y': y};
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
    // Simple tiles
    if (!type || type.layout_id == 'tile-1')
        return {'x': 0, 'y': 0};

    // Random alternating tiles
    if (type.layout_id == 'alt-4') {
        var key = d.x + ',' + d.y;
        if (!_variant[key]) {
            var dx = Math.random() < 0.5 ? 0 : 1;
            var dy = Math.random() < 0.5 ? 0 : 1;
            _variant[key] = {'x': dx, 'y': dy};
         }
         return _variant[key];
    }

    // Directional and/or animated tiles
    var isdir = type.layout_id.match(/dir/);
    var isanim = type.layout_id.match(/anim/);
    if (isdir || isanim) {
        var x = 0, y = 0;
        if (isdir) {
            y = dirIndex[d.orientation || 'u'];
        }
        if (isanim) {
            x = frame;
        }
        return {'x': x, 'y': y};
    }

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
       var img;
       buffer.context.clearRect(
           x, y, tileSize, tileSize
       );
       if (d.theme_id && ptype.themes) {
           img = ptype.themes[d.theme_id];
       } else {
           img = ptype.image;
       }
       buffer.context.drawImage(
           img,
           node.attr('tile-x'),
           node.attr('tile-y'),
           tileSize,
           tileSize,
           x,
           y,
           tileSize,
           tileSize
       );
   });
}

function check(pt, ox, oy) {
   return _getTile(pt.x + ox, pt.y + oy).theme_id == ptheme.id;
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
    if (!edit) {
        if (!d.type_id || d.type_id == 'p' || d.theme_id == ptheme.id || !ptypes[d.type_id])
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
    }
    d.pending = true;
    if (d.type_id == 'j')
        jumps++;
    score += ptypes[d.type_id].value || 0;
    if (edit) {
        var orient = d.orientation || 'u', newOrient;
        if (d.type_id == $('#pointtype').val()) {
            for (var di in dirIndex) {
                if (dirIndex[di] == dirIndex[orient] + 1) {
                    newOrient = di;
                }
                if (dirIndex[di] == 0 && dirIndex[orient] == 3) {
                    newOrient = di;
                }
            }
        }
        d.type_id = $('#pointtype').val();
        d.theme_id = $('#theme').val();
        d.orientation = newOrient;
    } else {
        d.type_id = 'i';
        d.theme_id = ptheme.id;
    }

    var cmd = "POINT " + d.x + " " + d.y + " " + d.type_id;
    if (d.theme_id || d.orientation ) {
        cmd += " " + (d.theme_id || 0)
        if (d.orientation) {
            cmd += " " + d.orientation;
        }
    }
    d.type_id = null;
    grid[x][y] = d;
    socket.send(cmd);
}

};

});
