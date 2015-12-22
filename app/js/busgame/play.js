define(["d3", "wq/app"], function(d3, app) {
return {
    'name': 'play',
    'init': function(){},
    'run': function(page) {
        if (page == 'play' || page == 'playbg' || page == 'edit') {
            $('body').css('overflow-y', 'hidden');
            play(page);
        } else {
            $('body').css('overflow-y', 'auto');
        }
    }
};

function play(mode) {

var panels = {
    'inited': false
};
function showPanel(name) {
    d3.values(panels).forEach(function(panel) {
        if (panel.style) {
            panel.style('display', 'none');
            panel.visible = false;
        }
    });
    panels[name].style('display', 'block');
    panels[name].visible = true;
}
if (mode == 'play') {
    panels.init = d3.select('#init-panel');
    panels.list = d3.select('#team-list-panel');
    panels.edit = d3.select('#team-edit-panel');
    panels.ship = d3.select('#ship-panel');
    showPanel('init');

    panels.list.select('#add-team').on('click', function() {
        showPanel('edit');
    });
    panels.edit.select('#save-team').on('click', function() {
        var theme_id = panels.edit.selected_theme;
        if (!theme_id) {
            return;
        }
        var name = panels.edit.select('input').node().value;
        socket.send('TEAM ' + name.replace(' ', '_') + ' ' + theme_id);
        showPanel('list');
    });
    panels.list.pickTeam = function(team) {
        socket.send('JOIN ' + team.id);
        panels.list.selected_team = team;
        updateShips();
        showPanel('ship');
    };
    panels.ship.select('#save-ship').on('click', function() {
        var ship_id = panels.ship.selected_ship;
        if (!ship_id) {
            return;
        }
        socket.send('SHIP ' + ship_id);
        panels.ship.style('display', 'none');
        startAnim(unknown);
        d3.timer(refresh);
    });
}

var intervals = {};

var ptypes;
app.models.pointtype.prefetch().then(function(data) {
    ptypes = {};
    data.list.forEach(function(ptype) {
        ptype.image = new Image();
        ptype.image.src = '/media/' + ptype.path;
        ptypes[ptype.id] = ptype;
        if (ptype.layout_id.match(/anim/)) {
            startAnim(ptype);
        }
        if (ptype.theme_id) {
            ptype.themes = {};
            themes.forEach(function(theme) {
                var timg = new Image();
                ptype.themes[theme.id] = timg;
                timg.onload = function() {
                    if (panels.list.visible || panels.edit.visible) {
                        updateTeams();
                    }
                    if (panels.ship.visible) {
                        updateShips();
                    }
                }
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
var bgtop = (mode == 'edit' ? 50 : 0);
var bounds = {
    'w': document.body.clientWidth,
    'h': document.body.clientHeight - bgtop
};
var length = bounds.w > bounds.h ? bounds.w : bounds.h;
while(length / renderSize > 20) {
    renderSize += tileSize;
}
var scale = renderSize / tileSize;
var bg = d3.select('#play').append('div')
    .style('position', 'fixed')
    .style('width', '100%')
    .style('height', '100%')
    .style('top', bgtop + 'px')
    .style('left', '0px');

addBackground();
function addBackground() {
    for (var bgx = 0; bgx <= (bounds.w / renderSize / 8); bgx++) {
        for (var bgy = 0; bgy <= (bounds.h / renderSize / 8); bgy++) {
            bg.append('img')
                .attr('src', '/media/bg/0/' + scale + '/' + bgx + '/' + bgy + '.png')
                .style('position', 'fixed')
                .style('left', (bgx * renderSize * 8) + 'px')
                .style('top', (bgy * renderSize * 8 + bgtop) + 'px')
        }
    }
}

var count = 128; // should load from server
var o = {};
o.x = Math.round(Math.random() * count / 2 + count / 4);
o.y = Math.round(Math.random() * count / 2 + count / 4);
o.w = Math.floor(bounds.w / renderSize / 2) * 2 + 2;
o.h = Math.floor(bounds.h / renderSize / 2) * 2;
if (mode != 'edit') {
    o.h += 2;
}
var last = {'x': o.x, 'y': o.y, 'w': o.w, 'h': o.h};
var scope = {'x': o.x, 'y': o.y, 'w': 20, 'h': 20};
var swidth = renderSize * o.w;
var sleft = (bounds.w - swidth) / 2;
var sheight = renderSize * o.h;
var stop = (bounds.h - sheight) / 2;
if (mode == 'edit') {
    stop += 40;
}
var grid = {};
var teams = {};
var teamThemes = [];
var ships = [];
var players = {};
var playerId;

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

function startAnim(ptype) {
    ptype.frame = 0;
    var interval = ptype.interval || 150;
    if (!intervals[interval]) {
        makeInterval(interval);
    }
    intervals[interval].ptypes.push(ptype);
}

function makeInterval(interval) {
    intervals[interval] = {
        'interval': setInterval(anim, interval),
        'ptypes': []
    }
    function anim() {
        intervals[interval].ptypes.forEach(function(ptype) {
            ptype.frame++;
            if (ptype.frame > 3)
                ptype.frame = 0;
        });
        render();
    }
}


var socket = new WebSocket('ws://' + window.location.host + ':10234');
socket.onmessage = function(msg) {
    var parts = msg.data.split(' ');
    var cmd = parts.shift();
    commands[cmd].apply(this, parts);
}

var commands = {};
commands['THEMES'] = function() {
    teamThemes = Array.prototype.slice.call(arguments);
    if (panels.list.visible || panels.edit.visible) {
        updateTeams();
    }
    if (!panels.inited) {
        showPanel('list');
        panels.inited = true;
    }
}
commands['SHIPS'] = function() {
    ships = Array.prototype.slice.call(arguments);
}
commands['TEAM'] = function(id, name, theme_id, score) {
    var team = teams[id] || {};
    team.id = id;
    team.name = name;
    team.theme_id = theme_id;
    team.score = score;
    teams[id] = team;
    updateTeams();
}

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
    pt.theme_id = theme;
    pt.orientation = orientation;
}

commands['PLAYER'] = function(pid, theme, type, x, y, assign) {
    if (mode != 'play') {
         return;
    }
    var player = players[pid] || {};
    player.id = pid;
    player.type_id = type;
    player.theme_id = theme;
    player.x = +x;
    player.y = +y;
    if (assign) {
        playerId = pid;
        nav(player);
    }
    players[pid] = player;
    if (panels.ship.visible) {
        updateShips();
    }
};
commands['PROJECTILE'] = function(pid, type, x, y, direction, destroy) {
    if (mode != 'play') {
         return;
    }
    var proj = players[pid] || {};
    proj.id = pid;
    proj.player_id = pid.split('-')[0];
    proj.type_id = type;
    proj.x = +x;
    proj.y = +y;
    proj.direction = direction;
    players[proj.player_id].orientation = direction;
    proj.destroy_type_id = destroy;
    proj.is_proj = true;
    players[pid] = proj;
}

commands['PATH'] = function() {
    if (mode != 'play') {
         return;
    }
    var pid = arguments[0];
    var path = Array.prototype.slice.call(arguments, 1);
    var player = players[pid] || {};
    var ppath = {}, lastStep;
    path.forEach(function(step, i) {
        var parts = step.match(/^(\d+):(\d+),(\d+)$/);
        if (!parts) {
            return;
        }
        var f = +parts[1];
        if (i == 0) {
            if (f < tickFrame || (f > 950 && tickFrame < 50)) {
                tickFrame = f;
            } else {
                var anyMoving = false;
                Object.keys(players).forEach(function(opid) {
                    if (opid == pid)
                        return;
                    if (players[opid].moving) {
                        anyMoving = true;
                    }
                });
                if (!anyMoving) {
                    tickFrame = f;
                }
            }
        }
        ppath[f] = lastStep = {
            'x': +parts[2],
            'y': +parts[3]
        };
    });
    player.path = ppath;
    player.target = lastStep;
    players[pid] = player;
}

var ticker = null;
var last = [];
var interval = 100;
commands['TICK'] = function(f) {
    if (ticker) {
        clearInterval(ticker);
    }
    var current = tickFrame;
    var server = +f;
    if (current === null || Math.abs(current - server) > 100) {
        tickFrame = server;
    } else if (server % 100 == 0) {
        var off;
        if (current < server || (server == 0 && current > 900)) {
            off = current % 100;
        } else {
            off = 100 + current % 100;
        }
        interval = interval * (off / 100);
    }
    if (interval < 50) {
        interval = 50;
    }
    if (interval > 150) {
        interval = 150;
    }

    d3.select('#score').text(Math.round(interval * 10000) / 10000);
    updateFrame();
    ticker = setInterval(tick, interval / 4);
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

var tickFrame = null;
function tick() {
    if (tickFrame === null) {
        return;
    }
    tickFrame += 0.25;
    tickFrame = tickFrame % 1000;
    d3.select('#loc').text(Math.floor(tickFrame));
    updateFrame();
}
function updateFrame() {
    for (var pid in players) {
        var player = players[pid];
        if (!player || !player.path) {
            continue;
        }
        var t1 = Math.floor(tickFrame);
        var t2 = Math.ceil(tickFrame) % 1000;
        var off = tickFrame - t1;
        var coords1 = player.path[t1];
        var coords2 = player.path[t2];
        var coords;
        var orientation;
        var ptype;
        if (!coords1 && !coords2) {
            var maxt = d3.max(Object.keys(player.path));
            var mint = d3.min(Object.keys(player.path));
            if (player.path[0] && player.path[999]) {
                maxt = d3.max(Object.keys(player.path).filter(function(d) {
                    return d < 800;
                }));
                mint = d3.min(Object.keys(player.path).filter(function(d) {
                    return d >= 800;
                }));
            }
            if (mint > tickFrame && mint < tickFrame + 50) {
                // FIXME: catch wraparound?
            } else {
                coords = player.target || player;
                if (player.is_proj) {
                     explode(player);
                }
                player.path = null;
                player.target = null;
                player.moving = false;
                ptype = ptypes[grid[coords.x][coords.y]];
            }
        } else if (coords1 && coords2) {
            coords = {
                'x': ((1-off) * coords1.x + off * coords2.x),
                'y': ((1-off) * coords1.y + off * coords2.y)
            };
            if (coords1.x != coords2.x || coords1.y != coords2.y) {
                if (coords1.x > coords2.x) {
                    orientation = 'l';
                } else if (coords1.x < coords2.x) {
                    orientation = 'r';
                } else if (coords1.y < coords2.y) {
                    orientation = 'd';
                } else {
                    orientation = 'u';
                }
            }
            var ptype1 = ptypes[grid[coords1.x][coords1.y].type_id];
            var ptype2 = ptypes[grid[coords2.x][coords2.y].type_id];
            if (ptype2 && ptype2.layer == 'a') {
                ptype = ptype2;
            } else {
                ptype = ptype1;
            }
        } else {
            coords = coords1 || coords2;
            ptype = ptypes[grid[coords.x][coords.y]];
        }
        if (coords) {
            player.x = coords.x;
            player.y = coords.y;
        }
        if (orientation) {
            player.orientation = orientation;
            player.moving = 2;
        } else {
            if (player.moving) {
                player.moving--;
            }
        }
        if (ptype) {
            player.under = (ptype.layer == 'a');
        }
    }
}

function explode(player) {
   player.type_id = player.destroy_type_id;
   player.frame = 0;
   player.destroy = setInterval(function() {
       player.frame++;
       if (player.frame > 3) {
            clearInterval(player.destroy);
            delete players[player.id];
       }
   }, 150);
}

function refresh() {
    var buffers = _getBuffers(_getViewport());
    context.clearRect(0, 0, swidth, sheight);
    drawPlayers(true, true);
    drawPlayers(true, false);
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
    drawPlayers(false, true);
    drawPlayers(false, false);
}

function drawPlayers(under, proj) {
    if (!ptypes) return;
    var viewport = _getViewport();
    for (var pid in players) {
        var player = players[pid];
        if (!!player.under != !!under) {
            continue;
        }
        if (!!player.is_proj != !!proj) {
            continue;
        }
        if (player.x < viewport.min.x - 1
            && player.y < viewport.min.y - 1
            && player.x > viewport.max.x + 1
            && player.y > viewport.max.y + 1) {
            continue;
        }
        drawPlayer(player);
    }
}
function drawPlayer(player) {
    var ptype = ptypes[player.type_id];
    var img = ptype.image;
    if (player.theme_id && ptype.themes) {
        img = ptype.themes[player.theme_id];
    }
    var tileOffset = _tileXY(player);
    context.drawImage(
        img,
        tileOffset.x * tileSize,
        tileOffset.y * tileSize,
        tileSize,
        tileSize,
        (player.x - (noffset.attr('x') - o.w / 2)) * renderSize,
        (player.y - (noffset.attr('y') - o.h / 2)) * renderSize,
        renderSize,
        renderSize
    );
    if (!player.moving || player.is_proj) {
        return;
    }
    tileOffset = _tileXY({
        'type_id': 'f',
        'orientation': player.orientation
    });
    var fx = player.x, fy = player.y;
    if (player.orientation == 'r') {
        fx--;
    } else if (player.orientation == 'l') {
        fx++;
    } else if (player.orientation == 'u') {
        fy++;
    } else if (player.orientation == 'd') {
        fy--;
    }
    context.drawImage(
        ptypes['f'].image,
        tileOffset.x * tileSize,
        tileOffset.y * tileSize,
        tileSize,
        tileSize,
        (fx - (noffset.attr('x') - o.w / 2)) * renderSize,
        (fy - (noffset.attr('y') - o.h / 2)) * renderSize,
        renderSize,
        renderSize
    );
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
        var ptype = ptypes[d.type_id];
        if (!ptype) {
            return;
        }
        var img = ptype.image;
        if (d.theme_id && ptype.themes) {
            img = ptype.themes[d.theme_id];
        }
        d.tileLoaded = img.complete;
    });
    var pts = custom.selectAll('tile')
        .data(current, function(d){
            return (
                d.x + '/' + d.y + '/' +
                d.type_id + '/' + d.theme_id + '/' + d.tileLoaded + '/' +
                d.tileOffset.x + '/' + d.tileOffset.y
            );
        });
    draw(pts.enter().append('tile'));
    pts.exit().remove();
    d3.select('#jumps').text(jumps);
//    d3.select('#score').text(score);
//    d3.select('#loc').text(Math.round(o.x, 1) + ',' + Math.round(o.y, 1));
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
    var ptype = ptypes[d.type_id] || unknown;
    // Simple tiles
    if (!ptype || ptype.layout_id == 'tile-1')
        return {'x': 0, 'y': 0};

    // Random alternating tiles
    if (ptype.layout_id == 'alt-4') {
        var key = d.x + ',' + d.y;
        if (!_variant[key]) {
            var dx = Math.random() < 0.5 ? 0 : 1;
            var dy = Math.random() < 0.5 ? 0 : 1;
            _variant[key] = {'x': dx, 'y': dy};
         }
         return _variant[key];
    }

    // Directional and/or animated tiles
    var isdir = ptype.layout_id.match(/dir/);
    var isanim = ptype.layout_id.match(/anim/);
    if (isdir || isanim) {
        var x = 0, y = 0;
        if (isdir) {
            y = dirIndex[d.orientation || 'u'];
        }
        if (isanim) {
            if (d.frame !== undefined) {
                x = d.frame;
            } else {
                x = ptype.frame || 0;
            }
        }
        return {'x': x, 'y': y};
    }

    // auto-16
    var l = sameLayer(_getTile(d.x - 1, d.y), d);
    var r = sameLayer(_getTile(d.x + 1, d.y), d);
    var u = sameLayer(_getTile(d.x, d.y - 1), d);
    var d = sameLayer(_getTile(d.x, d.y + 1), d);

    var tx = r + 3 * l - 2 * r * l;
    var ty = d + 3 * u - 2 * u * d;

    return {
        'x': tx,
        'y': ty
    }
}

function sameLayer(pt1, pt2) {
    var ptype1 = ptypes[pt1.type_id];
    var ptype2 = ptypes[pt2.type_id];
    if (!ptype1 || !ptype2) {
        return false;
    }
    return ptype1.layer == ptype2.layer;
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


function mouse() {
    var coords = d3.mouse(this);
    coords[0] = Math.round(coords[0] / renderSize + o.x - 0.5) - (o.w / 2);
    coords[1] = Math.round(coords[1] / renderSize + o.y - 0.5) - (o.h / 2);
    return coords;
}

function click() {
    var coords = mouse.call(this);
    var x = coords[0], y = coords[1];
    var dx = x - o.x;
    var dy = y - o.y;
    if (dx > (o.w / 2 - 3) || dx < (-o.w / 2 + 2) ||
        dy > (o.h / 2 - 3) || dy < (-o.h / 2 + 2)) {
        nav({'x': x, 'y': y}, true);
        return;
    }
    if (mode == 'play') {
        handleClick(x, y);
        return;
    }

    var d = _getTile(x, y);
    if (mode == 'playbg') {
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
    if (mode == 'edit') {
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

function handleClick(x, y) {
    var xi = players[playerId].x; 
    var yi = players[playerId].y; 
    var dx = x - xi;
    var dy = y - yi;
    var dir, xd = 0, yd = 0;
    if (dx == 0 || dy == 0) {
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                dir = 'r';
                xd = 1;
            } else {
                dir = 'l';
                xd = -1;
            }
        } else {
            if (dy > 0) {
                dir = 'd';
                yd = 1;
            } else {
                dir = 'u';
                yd = -1;
            }
        }
        var ptype = ptypes[grid[x][y].type_id];
        if ((ptype.layer == 'd' || ptype.layer == 'e') ||
            (Math.abs(dx) + Math.abs(dy) == 2 && (ptype.layer == 'a' || ptype.layer == 'b'))) {
            while (xi != x - xd || yi != y - yd) {
                xi += xd;
                yi += yd;
                ptype = ptypes[grid[xi][yi].type_id];
                if (ptype.layer != 'a' && ptype.layer != 'b') {
                    dir = false;
                }
            }
            if (ptype.layer == 'e' && Math.abs(dx) + Math.abs(dy) == 1) {
                dir = false;
            }
        } else {
            dir = false; 
        }
    }
    if (dir) {
        socket.send('FIRE ' + dir);
    } else {
        socket.send('GO ' + x + ' ' + y);
    }
}

var themeImgs = {};
function themeImg(type_id, theme_id) {
    if (themeImgs[type_id + ':' + theme_id]) {
        return themeImgs[type_id + ':' + theme_id];
    }
    var img = ptypes && ptypes[type_id] && ptypes[type_id].themes && ptypes[type_id].themes[theme_id];
    if (!img || !img.complete) {
        return '';
    }
    var tcanvas = document.createElement('canvas');
    tcanvas.width = tcanvas.height = renderSize;
    var tcontext = tcanvas.getContext('2d');
    tcontext.webkitImageSmoothingEnabled = false;
    tcontext.mozImageSmoothingEnabled = false;
    tcontext.imageSmoothingEnabled = false;
    tcontext.drawImage(
        img,
        0,
        0,
        tileSize,
        tileSize,
        0,
        0,
        renderSize,
        renderSize
    );
    var data = tcanvas.toDataURL('image/png');
    themeImgs[type_id + ':' + theme_id] = data;
    return data;
}

function btnStyle(sel) {
    sel.style('cursor', 'pointer')
       .style('margin', (4 / tileSize * renderSize) + 'px')
       .style('padding', (4 / tileSize * renderSize) + 'px')
       .style('border', (4 / tileSize * renderSize) + 'px solid transparent')
       .style('border-radius', (6 / tileSize * renderSize) + 'px');
}

function updateTeams() {
    var items = panels.list.select('ul').selectAll('li.team').data(
        d3.values(teams), function(d) { return d.id }
    );
    var enter = items.enter().append('li')
       .attr('class', 'team')
    enter.append('img')
        .style('vertical-align', 'middle')
    enter.append('h3')
        .style('display', 'inline')
        .style('vertical-align', 'middle')
        .style('font-size', (renderSize * 0.8) + 'px')
        .style('margin-left', '1em');
    items.select('h3').text(function(d) {
        return d.name.replace('_', ' ');
    });
    items.select('img').attr('src', function(d) {
        return themeImg('i', d.theme_id);
    });
    items.on('click', panels.list.pickTeam);
    var unusedThemes = [];
    teamThemes.forEach(function(theme_id) {
        var found = false;
        d3.values(teams).forEach(function(team) {
            if (team.theme_id == theme_id) {
                found = true;
            }
        });
        if (!found) {
            unusedThemes.push({
                'id': theme_id,
                'image': themeImg('i', theme_id)
            });
        }
    });

    var imgs = panels.edit.select('#theme-choices').selectAll('img').data(
        unusedThemes, function(d) { return d.id }
    );
    btnStyle(imgs.enter().append('img'));
    imgs.attr('src', function(d) { return d.image });
    imgs.on('click', function(d) {
        panels.edit.selected_theme = d.id;
        imgs.style('border-color', 'transparent');
        d3.select(this).style('border-color', 'white');
    });
    imgs.exit().remove();
}

function updateShips() {
    var unusedShips = [];
    ships.forEach(function(type_id) {
        var found = false;
        for (var pid in players) {
            var player = players[pid];
            if (player.theme_id == panels.list.selected_team.theme_id
                && player.type_id == type_id) {
                found = true;
            }
        }
        if (!found) {
            unusedShips.push({
                'id': type_id,
                'image': themeImg(type_id, panels.list.selected_team.theme_id)
            });
        }
    });
    imgs = panels.ship.select('#ship-choices').selectAll('img').data(
        unusedShips, function(d) { return d.id}
    );
    btnStyle(imgs.enter().append('img'))
    imgs.attr('src', function(d) { return d.image });
    imgs.on('click', function(d) {
        panels.ship.selected_ship = d.id;
        imgs.style('border-color', 'transparent');
        d3.select(this).style('border-color', 'white');
    });
    imgs.exit().remove();
}

};

});
