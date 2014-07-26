require(["d3", "wq/store"], function(d3, ds) {
ds.init('');
localStorage.clear();

var pcolors = ['#99f', '#f9f', '#9ff', '#f99', '#ff9', '#9f9'];
var pcolor = pcolors[Math.floor(Math.random()*pcolors.length)];

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
var version = 1;

var size = 64;
var space = 0;
var count = 20;//41;
var o = {'x': 0, 'y': 0, 'w': 8, 'h': 5};
var last = {'x': 0, 'y': 0, 'w': 8, 'h': 5};
var swidth = (size + space) * o.w;
var sheight = (size + space) * o.h;

setInterval(function() {
    o.x += Math.round(Math.random() * 5 - 2.5);
    o.y += Math.round(Math.random() * 5 - 2.5);
    if (o.x < -2) o.x = -2;
    if (o.y < -2) o.y = -2;
    if (o.x > count + 2) o.x = count;
    if (o.y > count + 2) o.y = count;
    render2({'list': curlist.data});
    last.x = o.x;
    last.y = o.y;
}, 2000);

var curlist = {};
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
update();
function update() {
   d3.json('/points.json?version__gte=' + version, render2);
}

var colors = [];
function render2(plist) {
   curlist.data = plist.list;
   var current = [];
   curlist.data.forEach(function(d) {
      if (d.version > version)
         version=d.version;
      if (d.x >= o.x - 1 && d.x < o.x + o.w + 1 && d.y >= o.y - 1 && d.y < o.y + o.h + 1)
         current.push(d);
   });
  
   var pts = svg.selectAll('g.point')
     .data(current, function(d){return d.x + '-' + d.y});
   init(pts.enter());
   styles(pts);
   pts.exit().transition().duration(1000).attr('transform', _transform()).remove();
d3.select('#jumps').text(jumps);
d3.select('#score').text(score);
//d3.select('#version').text(version);
}

function init(pts) {
      curlist.data.forEach(function(d) {
    var num = Math.random();
    var col;
    if (num > 0.75)
      col= '#ddd';
      else if (num > 0.5)
      col= '#aaa';
      else if (num > 0.25)
      col= '#ccc';
      else
      col= '#999';
      colors[d.id] = col;

      });

   var g = pts.append('g').attr('class', 'point')

   
/*   pts.append('rect')
     .attr('width', size)
     .attr('height', size);
   pts.append('circle')
     .attr('r', size * 0.4)
     .attr('cx', size * 0.5)
     .attr('cy', size * 0.5) */
   g.append('image')
       .attr('width', size * 4)
       .attr('height', size * 4)
       .attr('xlink:href', '/images/tile.png')
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
   if (x < 0 || x >= count || y < 0 || y >= count)
      return {}
    var index = x * count + y;
    var result = curlist.data[index] || {};
    return result;
}
function _tileXY(d) {
//    if (d.type != 'p')
//        return {'x': -1, 'y': -1};
    var l = _getTile(d.x - 1, d.y).type == d.type;
    var r = _getTile(d.x + 1, d.y).type == d.type;
    var u = _getTile(d.x, d.y - 1).type == d.type;
    var d = _getTile(d.x, d.y + 1).type == d.type;

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

function _transform(uselast) {
  var offset = uselast ? last : o;
  return function(d) {
    return 'translate(' + ((-offset.x + d.x)*(size+space)) + ',' + ((-offset.y + d.y)*(size+space)) + ')';
  }
}

function styles(pts) {
   pts.attr('transform', _transform(true));
   pts.transition().duration(1000).attr('transform', _transform());
   pts.select('image')
     .attr('clip-path', _tileClip)
     .attr('transform', _tileXForm);
   pts.select('rect')
     .attr('fill', color)
     .attr('stroke', function(d) {
        if (d.clear) return 'transparent';
        return '#999'});       

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
