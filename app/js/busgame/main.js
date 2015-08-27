require(["d3", "wq/store", "wq/model"], function(d3, ds, model) {
ds.init({'service': ''});
var ptypes;
model('/pointtypes').load().then(function(data) {
    ptypes = {};
    data.list.forEach(function(ptype) {
        ptype.image = new Image();
        ptype.image.src = ptype.path;
        ptypes[ptype.id] = ptype;
    });
});
var unknown = new Image();
unknown.src = '/images/unknown.png';

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

var size;
if (window.innerWidth < 1000 && window.innerHeight < 700)
    size = 48;
else
    size = 64;
var space = 0;
var count = 128; // should load from server
var wt = Math.floor((window.innerWidth - count) / size);
var ht = Math.floor(window.innerHeight / size);
var x = Math.round(Math.random() * count / 2 + count / 4);
var y = Math.round(Math.random() * count / 2 + count / 4);
var o = {'x': x, 'y': y, 'w': wt, 'h': ht};
var last = {'x': o.x, 'y': o.y, 'w': o.w, 'h': o.h};
var scope = {'x': o.x, 'y': o.y, 'w': 20, 'h': 20};
var swidth = (size + space) * o.w;
var sheight = (size + space) * o.h;
var grid = {}


function nav(d) {
    o.x = d.x;
    o.y = d.y;
    if (o.x < 0) o.x = 0;
    if (o.y < 0) o.y = 0;
    if (o.x > count) o.x = count;
    if (o.y > count) o.y = count;
    if (Math.abs(scope.x - o.x) > 3 || Math.abs(scope.y - o.y) > 3) {
        scope.x = o.x;
        scope.y = o.y;
    }
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
}

var canvas = d3.select('body').append('canvas')
   .attr('width', swidth)
   .attr('height', sheight);
canvas.on('click', function(evt) {
    var evt = d3.event;
    nav({
        'x': Math.round(evt.x / size) + o.x - (o.w / 2),
        'y': Math.round(evt.y / size) + o.y - (o.h / 2),
   });
});
var context = canvas.node().getContext('2d');

var mini = d3.select('body').append('canvas')
    .attr('width', count)
    .attr('height', count)
    .attr('style', 'position:absolute;right:0;bottom:0;');
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

setInterval(anim, 250);
var frame = 0;
function anim() {
    frame++;
    if (frame > 3)
        frame = 0;
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

d3.timer(render);
function render() {
    if (!ptypes) return;
    var minx = Math.floor(o.x - o.w / 2 - o.b),
        maxx = Math.ceil(o.x + o.w / 2 + o.b),
        miny = Math.floor(o.y - o.h / 2 - o.b),
        maxy = Math.ceil(o.y + o.h / 2 + o.b),
        current = _getTiles(minx, miny, maxx, maxy);

    var pts = custom.selectAll('tile')
        .data(current, function(d){return d.x + ',' + d.y});
    pts.enter().append('tile');
    draw(pts);
    d3.select('#jumps').text(jumps);
    d3.select('#score').text(score);
    d3.select('#loc').text(o.x + ',' + o.y);
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
    return grid[x][y];
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

var _variant = {};
function _tileXY(d) {
    var type = ptypes[d.type_id];
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
    if (type.layout == 'anim-4')
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
       var ox = noffset.attr('x');
       return (-ox + o.w / 2 + d.x) * (size+space);
   });
   pts.attr('y', function(d) {
       var oy = noffset.attr('y');
       return (-oy + o.h / 2 + d.y) * (size+space);
   });
   pts.attr('tile-x', function(d) {
       return _tileXY(d).x * size / 2;
   });
   pts.attr('tile-y', function(d) {
       return _tileXY(d).y * size / 2;
   });
   pts.each(function(d) {
       var node = d3.select(this);
       var ptype = ptypes[d.type_id];
       if (!ptype || !ptype.image) {
           image = unknown;
       } else {
           image = ptype.image;
       }
       context.drawImage(
           image,
           node.attr('tile-x'),
           node.attr('tile-y'),
           size / 2,
           size / 2,
           node.attr('x'),
           node.attr('y'),
           size,
           size
       );
   });
}

function check(pt, ox, oy) {
   return _getTile(pt.x + ox, pt.y + oy).clear == pcolor;
}

function click(d) {
   nav(d);
   if (!d.type_id || d.type_id == 'p' || d.clear == pcolor)
      return;
   var type = ptypes.find(d.type_id);
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
   score += type.value;
   d.type_id = 'c';
   d.clear = pcolor;
   render2();

   ds.save({
       'url': 'points/' + d.id,
       'method': 'PUT',
       'x': d.x,
       'y': d.y,
       'type': d.type_id,
       'clear': pcolor,
       'csrfmiddlewaretoken': ds.get('csrftoken'),
       'csrftoken': ds.get('csrftoken')
   }, undefined, function(item, result){
       if (item.saved) {
           result.last_version = result.version;
           grid[result.x][result.y] = result;
           render2();
       }
   });
}

});
