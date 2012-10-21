require(["wq/lib/d3", "wq/store"], function(d3, ds) {
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

var size = 32;
var space = 2;
var count = 20;
var total = (size + space) * count;

var curlist = {};
var svg = d3.select('body').append('svg').attr('width', total).attr('height', total);

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
   d3.json('/points.json', render2);
}

var colors = [];
function render2(plist) {
   curlist.data = plist.list;
   if (colors.length == 0) {
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
   }
   svg.selectAll('g.point')
     .data([])
     .exit().remove()
   var pts = svg.selectAll('g.point')
     .data(plist.list)
     .enter().append('g').attr('class', 'point')
   
   pts.append('rect')
     .attr('width', size)
     .attr('height', size)
     .attr('fill', color)
     .attr('stroke', function(d) {
        if (d.clear) return 'transparent';
        return '#999'});       

   pts.append('circle')
     .attr('r', size * 0.4)
     .attr('cx', size * 0.5)
     .attr('cy', size * 0.5)
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
   pts.attr('transform', function(d) {
        return 'translate(' + (d.x*(size+space)) + ',' + (d.y*(size+space)) + ')';
     });

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
pts.on('mouseover', function() {
//   d3.select(this).selectAll('rect').attr('fill', hcolor)
});
pts.on('mouseout', function() {
//   d3.select(this).selectAll('rect').attr('fill', color);
});

d3.select('#jumps').text(jumps)
d3.select('#score').text(score)
pts.on('click', function(d) {
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
       d3.select('#score').text(score)
   }

   ds.save({
       'url': 'points/' + d.id,
       'method': 'PUT',
       'x': d.x,
       'y': d.y,
       'type': d.type,
       'clear': pcolor,
   }, undefined, update);
});

}
function render(plist) {
   d3.selectAll('g.point')
     .data(plist.list)
     .attr('fill', color);
}

});
