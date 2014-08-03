require(["d3", "wq/store"], function(d3, ds) {
ds.init('');
var ptypes;
ds.getList({'url': 'pointtypes'}, function(list) {
    ptypes = list;
});
localStorage.clear();

var pcolors = ['#99f', '#f9f', '#9ff', '#f99', '#ff9', '#9f9'];
var pcolor = pcolors[Math.floor(Math.random()*pcolors.length)];
var layouts = {
    'tile-1': [1, 1],
    'alt-4': [2, 2],
    'anim-4': [4, 1],
    'auto-16': [4, 4]
};
var doMove;

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

var size = 64;
var space = 0;
var count = 128; // should load from server
var o = {'x': 32, 'y': 32, 'w': 8, 'h': 6};
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
    doMove = true;
}

var svg = d3.select('body').append('svg')
   .attr('width', swidth + 10)
   .attr('height', sheight + 10);
svg.append('rect')
   .attr('width', swidth + 10)
   .attr('height', sheight + 10)
   .attr('fill', '#999');
var defs = svg.append('defs')
defs.append('clipPath')
      .attr('id', 'clip')
   .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', swidth)
      .attr('height', sheight);
[0, 1, 2, 3].forEach(function(x) {
    [0, 1, 2, 3].forEach(function(y) {
        defs.append('clipPath')
           .attr('id', 'tile-clip-' + x + '-' + y)
           .append('rect')
               .attr('x', x * size)
               .attr('y', y * size)
               .attr('width', size)
               .attr('height', size);
    });
});
svg = svg.append('g')
   .attr('transform', 'translate(5,5)')
   .attr('clip-path', 'url(#clip)');
svg.append('rect')
   .attr('width', swidth)
   .attr('height', sheight)
   .attr('fill', '#fff');

doMove = true;
render2();

function color(d) {
  if (d.clear)
    return d.clear;
  else if (d.type == 'p')
    return '#333';
  else
    return colors[d.id];
}
function hcolor(d) {
  if (d.clear)
    return 'transparent';
  else
    return '#eef';
}
setInterval(anim, 1000);
var frame = 0;
function anim() {
    frame++;
    if (frame > 3)
        frame = 0;
    render2();
}
setInterval(update, 2000);
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
        data.list.forEach(function(d) {
            d.last_version = data.last_version;
            if (!grid[d.x])
                grid[d.x] = {};
            grid[d.x][d.y] = d;
        });
    });
}

var colors = [];
function render2() {
    if (!ptypes) return;
    var minx = o.x - o.w / 2 - 1,
        maxx = o.x + o.w / 2 + 1,
        miny = o.y - o.h / 2 - 1,
        maxy = o.y + o.h / 2 + 1,
        current = _getTiles(minx, miny, maxx, maxy);

    var pts = svg.selectAll('g.point')
        .data(current, function(d){return d.x + ',' + d.y});
    init(pts.enter());
    styles(pts);
    if (doMove) {
        move(pts);
        pts.exit().transition().duration(1000)
            .attr('transform', _transform()).remove();
        doMove = false;
        last.x = o.x;
        last.y = o.y;
    }
    // d3.select('#jumps').text(jumps);
    // d3.select('#score').text(score);
    //d3.select('#version').text(version);
}

function init(pts) {
   var g = pts.append('g').attr('class', 'point')

   
/*   pts.append('rect')
     .attr('width', size)
     .attr('height', size);
   pts.append('circle')
     .attr('r', size * 0.4)
     .attr('cx', size * 0.5)
     .attr('cy', size * 0.5) */
   g.append('image')
       .attr('title', function(d) { return d.label })
       .attr('image-rendering', 'optimizeSpeed');

g.on('mouseover', function() {
//   d3.select(this).selectAll('rect').attr('fill', hcolor)
});
g.on('mouseout', function() {
//   d3.select(this).selectAll('rect').attr('fill', color);
});
   g.on('click', click);
   return pts;
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
    var type = ptypes.find(d.type_id);
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
function _tileXForm(d) {
    var xy = _tileXY(d);
    return 'translate(' + [
        xy.x * -size,
        xy.y * -size,
    ].join(',') + ')';
}
function _tileClip(d) {
    var xy = _tileXY(d);
    return "url(#tile-clip-" + xy.x + '-' + xy.y + ")";
}
function _tileWidth(d) {
    var type = ptypes.find(d.type_id);
    if (type && layouts[type.layout])
        return layouts[type.layout][0] * size;
    return size;
}
function _tileHeight(d) {
    var type = ptypes.find(d.type_id);
    if (type && layouts[type.layout])
        return layouts[type.layout][1] * size;
    return size;
}
function _tileSrc(d) {
    var type = ptypes.find(d.type_id);
    if (type)
        return '/media/' + type.path;
    return '/images/unknown.png';
}

function _transform(uselast) {
  var offset = uselast ? last : o;
  return function(d) {
    return 'translate(' + ((-offset.x + offset.w / 2 + d.x)*(size+space)) + ',' + ((-offset.y + offset.h / 2 + d.y)*(size+space)) + ')';
  }
}

function move(pts) {
   pts.attr('transform', _transform(true));
   pts.transition().duration(1000).attr('transform', _transform());
}

function styles(pts) {
   pts.select('image')
     .attr('width', _tileWidth)
     .attr('height', _tileHeight)
     .attr('xlink:href', _tileSrc)
     .attr('clip-path', _tileClip)
     .attr('transform', _tileXForm);

   /*
   pts.select('circle')
      .attr('stroke', function(d) {
        if (!d.clear)
           return 'transparent';
        if (d.type == 'b')
           return 'transparent';

        return '#999';
     })
     .attr('fill', function(d) {
         if (!d.clear)
            return 'transparent';
         if (d.type == 'j')
            return 'green';
         if (d.type == 'g')
            return 'gold';
         if (d.type == 'd')
            return '#eee';
         if (d.type == 's')
            return 'white';
         if (d.type == 't')
            return 'red';
         return 'transparent';
     })
     */
}

function check(pt, ox, oy) {
   if (pt.x + ox < 0)
      return false;
   if (pt.x + ox >= count)
      return false;
   if (pt.y + oy < 0)
      return false;
   if (pt.y + oy >= count)
      return false;
   var index = ((pt.x+ox)*count)+(pt.y+oy);
   return curlist.data[index].clear == pcolor;
}

function click(d) {
   nav(d);
   return;
   if (d.type == 'p')
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
   d3.select(this).selectAll('rect').attr('fill', '#f90')
   if (d.clear) {
       if (d.type == 'j')
          jumps++;
       if (d.type == 's')
          score += 50;
       if (d.type == 'g')
          score += 100;
       if (d.type == 'd')
          score += 500;
       if (d.type == 't')
          score += 10000;
       d.type = 'b';
   }

   ds.save({
       'url': 'points/' + d.id,
       'method': 'PUT',
       'x': d.x,
       'y': d.y,
       'type': d.type,
       'clear': pcolor,
       'version': version
   }, undefined, update);
}

});
